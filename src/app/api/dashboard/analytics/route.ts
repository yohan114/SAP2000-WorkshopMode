import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/dashboard/analytics - Get advanced analytics data
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const months = parseInt(url.searchParams.get('months') || '6');

    // Calculate date ranges
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Run all analytics queries in parallel
    const [
      monthlyJobCardsCreated,
      monthlyJobCardsCompleted,
      monthlyCosts,
      jobCardsWithDurations,
      downtimeLogs,
      assetsWithCategory,
      stockTransactions,
      stockValueHistory,
      assetUtilization,
    ] = await Promise.all([
      // Monthly job cards created
      db.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count
        FROM JobCard
        WHERE isActive = 1 AND createdAt >= ${sixMonthsAgo}
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY month ASC
      `,

      // Monthly job cards completed
      db.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT strftime('%Y-%m', COALESCE(closedAt, actualEnd)) as month, COUNT(*) as count
        FROM JobCard
        WHERE isActive = 1 
          AND status IN ('COMPLETED', 'CLOSED')
          AND COALESCE(closedAt, actualEnd) >= ${sixMonthsAgo}
        GROUP BY strftime('%Y-%m', COALESCE(closedAt, actualEnd))
        ORDER BY month ASC
      `,

      // Monthly costs (estimated vs actual)
      db.$queryRaw<Array<{ 
        month: string; 
        estimatedCost: number | null; 
        actualCost: number | null;
      }>>`
        SELECT 
          strftime('%Y-%m', createdAt) as month,
          SUM(CASE WHEN estimatedCost IS NOT NULL THEN CAST(estimatedCost AS REAL) ELSE 0 END) as estimatedCost,
          SUM(CASE WHEN actualCost IS NOT NULL THEN CAST(actualCost AS REAL) ELSE 0 END) as actualCost
        FROM JobCard
        WHERE isActive = 1 AND createdAt >= ${sixMonthsAgo}
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY month ASC
      `,

      // Job cards with duration data for MTTR calculation
      db.jobCard.findMany({
        where: {
          isActive: true,
          status: { in: ['COMPLETED', 'CLOSED'] },
          actualStart: { not: null },
          actualEnd: { not: null },
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          id: true,
          assetId: true,
          actualStart: true,
          actualEnd: true,
          actualDuration: true,
          asset: {
            select: {
              id: true,
              categoryId: true,
              category: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      }),

      // Downtime logs for MTBF calculation
      db.downtimeLog.findMany({
        where: {
          startTime: { gte: sixMonthsAgo },
        },
        select: {
          id: true,
          assetId: true,
          downtimeType: true,
          startTime: true,
          endTime: true,
          totalMinutes: true,
          asset: {
            select: {
              id: true,
              categoryId: true,
              category: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      }),

      // Assets with category for utilization
      db.asset.findMany({
        where: { isActive: true },
        select: {
          id: true,
          status: true,
          categoryId: true,
          category: {
            select: { id: true, code: true, name: true },
          },
        },
      }),

      // Stock transactions for inventory turnover
      db.stockTransaction.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          id: true,
          transactionType: true,
          quantity: true,
          totalValue: true,
          createdAt: true,
        },
      }),

      // Stock value history by month
      db.$queryRaw<Array<{ 
        month: string; 
        transactionType: string;
        totalValue: number;
      }>>`
        SELECT 
          strftime('%Y-%m', createdAt) as month,
          transactionType,
          SUM(CAST(totalValue AS REAL)) as totalValue
        FROM StockTransaction
        WHERE createdAt >= ${sixMonthsAgo}
        GROUP BY strftime('%Y-%m', createdAt), transactionType
        ORDER BY month ASC
      `,

      // Asset utilization data
      db.$queryRaw<Array<{ 
        status: string; 
        count: bigint;
      }>>`
        SELECT status, COUNT(*) as count
        FROM Asset
        WHERE isActive = 1
        GROUP BY status
      `,
    ]);

    // Generate month labels for the last N months
    const monthLabels: string[] = [];
    const monthDataMap = new Map<string, { created: number; completed: number; estimatedCost: number; actualCost: number }>();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthLabels.push(monthKey);
      monthDataMap.set(monthKey, { created: 0, completed: 0, estimatedCost: 0, actualCost: 0 });
    }

    // Populate monthly data
    monthlyJobCardsCreated.forEach((item) => {
      const data = monthDataMap.get(item.month);
      if (data) data.created = Number(item.count);
    });

    monthlyJobCardsCompleted.forEach((item) => {
      const data = monthDataMap.get(item.month);
      if (data) data.completed = Number(item.count);
    });

    monthlyCosts.forEach((item) => {
      const data = monthDataMap.get(item.month);
      if (data) {
        data.estimatedCost = Number(item.estimatedCost || 0);
        data.actualCost = Number(item.actualCost || 0);
      }
    });

    // Build monthly trends array
    const monthlyTrends = monthLabels.map((month) => {
      const data = monthDataMap.get(month)!;
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: monthNames[parseInt(monthNum) - 1],
        fullMonth: month,
        created: data.created,
        completed: data.completed,
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
      };
    });

    // Calculate MTTR by asset category
    const mttrByCategory = new Map<string, { name: string; code: string; totalDuration: number; count: number }>();
    
    jobCardsWithDurations.forEach((jc) => {
      const categoryId = jc.asset?.categoryId;
      const categoryName = jc.asset?.category?.name || 'Unknown';
      const categoryCode = jc.asset?.category?.code || 'UNK';
      
      if (!categoryId) return;
      
      // Calculate duration in hours
      let durationHours = 0;
      if (jc.actualDuration) {
        durationHours = jc.actualDuration; // Already in hours
      } else if (jc.actualStart && jc.actualEnd) {
        const diff = new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime();
        durationHours = diff / (1000 * 60 * 60);
      }
      
      const existing = mttrByCategory.get(categoryId);
      if (existing) {
        existing.totalDuration += durationHours;
        existing.count += 1;
      } else {
        mttrByCategory.set(categoryId, {
          name: categoryName,
          code: categoryCode,
          totalDuration: durationHours,
          count: 1,
        });
      }
    });

    const mttrData = Array.from(mttrByCategory.entries()).map(([id, data]) => ({
      id,
      category: data.name,
      code: data.code,
      mttr: data.count > 0 ? Number((data.totalDuration / data.count).toFixed(2)) : 0,
      jobCount: data.count,
    }));

    // Calculate MTBF by asset category (Mean Time Between Failures)
    // MTBF = Total operating time / Number of breakdowns
    const mtbfByCategory = new Map<string, { name: string; code: string; totalDowntime: number; breakdownCount: number }>();
    
    downtimeLogs.forEach((dl) => {
      const categoryId = dl.asset?.categoryId;
      const categoryName = dl.asset?.category?.name || 'Unknown';
      const categoryCode = dl.asset?.category?.code || 'UNK';
      
      if (!categoryId || dl.downtimeType !== 'BREAKDOWN') return;
      
      const downtimeMinutes = dl.totalMinutes || 
        (dl.endTime && dl.startTime 
          ? (new Date(dl.endTime).getTime() - new Date(dl.startTime).getTime()) / (1000 * 60)
          : 0);
      
      const existing = mtbfByCategory.get(categoryId);
      if (existing) {
        existing.totalDowntime += downtimeMinutes;
        existing.breakdownCount += 1;
      } else {
        mtbfByCategory.set(categoryId, {
          name: categoryName,
          code: categoryCode,
          totalDowntime: downtimeMinutes,
          breakdownCount: 1,
        });
      }
    });

    // Calculate MTBF in hours
    // Assuming average operating time per month ~720 hours (30 days)
    // MTBF = (Operating hours - Downtime hours) / Number of failures
    const mtbfData = Array.from(mtbfByCategory.entries()).map(([id, data]) => {
      const totalOperatingHours = months * 720; // Approximate operating hours
      const downtimeHours = data.totalDowntime / 60;
      const effectiveOperatingHours = totalOperatingHours - downtimeHours;
      const mtbf = data.breakdownCount > 0 
        ? Number((effectiveOperatingHours / data.breakdownCount).toFixed(2))
        : totalOperatingHours; // If no breakdowns, MTBF is the entire period
      
      return {
        id,
        category: data.name,
        code: data.code,
        mtbf,
        breakdownCount: data.breakdownCount,
        totalDowntimeHours: Number(downtimeHours.toFixed(2)),
      };
    });

    // Calculate cost comparison
    const totalEstimatedCost = monthlyTrends.reduce((sum, m) => sum + m.estimatedCost, 0);
    const totalActualCost = monthlyTrends.reduce((sum, m) => sum + m.actualCost, 0);
    const costVariance = totalEstimatedCost > 0 
      ? Number((((totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 100).toFixed(2))
      : 0;

    // Inventory turnover analysis
    const inventoryTurnover = stockValueHistory.reduce((acc, item) => {
      const month = item.month;
      if (!acc[month]) {
        acc[month] = { receipts: 0, issues: 0, adjustments: 0 };
      }
      
      const value = Number(item.totalValue || 0);
      if (item.transactionType === 'RECEIPT' || item.transactionType === 'GRN') {
        acc[month].receipts += value;
      } else if (item.transactionType === 'ISSUE' || item.transactionType === 'MI_ISSUE') {
        acc[month].issues += value;
      } else {
        acc[month].adjustments += Math.abs(value);
      }
      
      return acc;
    }, {} as Record<string, { receipts: number; issues: number; adjustments: number }>);

    const inventoryTurnoverData = monthLabels.map((month) => {
      const data = inventoryTurnover[month] || { receipts: 0, issues: 0, adjustments: 0 };
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: monthNames[parseInt(monthNum) - 1],
        fullMonth: month,
        receipts: data.receipts,
        issues: data.issues,
        adjustments: data.adjustments,
        turnover: data.receipts > 0 ? Number((data.issues / data.receipts).toFixed(2)) : 0,
      };
    });

    // Asset utilization metrics
    const utilizationByStatus = (assetUtilization as any[]).reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {} as Record<string, number>);

    const totalAssets: number = Object.values(utilizationByStatus).reduce((sum: number, count: number) => sum + count, 0);
    const operationalCount = utilizationByStatus['OPERATIONAL'] || 0;
    const underRepairCount = utilizationByStatus['UNDER_REPAIR'] || 0;
    const utilizationRate = totalAssets > 0 
      ? Number(((operationalCount / totalAssets) * 100).toFixed(1))
      : 0;

    // Asset utilization by category
    const utilizationByCategory = new Map<string, { 
      name: string; 
      operational: number; 
      total: number; 
    }>();

    assetsWithCategory.forEach((asset) => {
      const categoryId = asset.categoryId;
      const categoryName = asset.category?.name || 'Unknown';
      
      const existing = utilizationByCategory.get(categoryId);
      if (existing) {
        existing.total += 1;
        if (asset.status === 'OPERATIONAL') {
          existing.operational += 1;
        }
      } else {
        utilizationByCategory.set(categoryId, {
          name: categoryName,
          operational: asset.status === 'OPERATIONAL' ? 1 : 0,
          total: 1,
        });
      }
    });

    const assetUtilizationByCategory = Array.from(utilizationByCategory.entries())
      .map(([id, data]) => ({
        id,
        category: data.name,
        operational: data.operational,
        total: data.total,
        utilizationRate: data.total > 0 
          ? Number(((data.operational / data.total) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Build response
    const analytics = {
      monthlyTrends: {
        jobCards: monthlyTrends.map(m => ({
          month: m.month,
          fullMonth: m.fullMonth,
          created: m.created,
          completed: m.completed,
        })),
        costs: monthlyTrends.map(m => ({
          month: m.month,
          fullMonth: m.fullMonth,
          estimated: m.estimatedCost,
          actual: m.actualCost,
        })),
      },
      reliability: {
        mttr: {
          overall: mttrData.length > 0 
            ? Number((mttrData.reduce((sum, m) => sum + m.mttr * m.jobCount, 0) / 
                mttrData.reduce((sum, m) => sum + m.jobCount, 0)).toFixed(2))
            : 0,
          byCategory: mttrData,
        },
        mtbf: {
          overall: mtbfData.length > 0
            ? Number((mtbfData.reduce((sum, m) => sum + m.mtbf, 0) / mtbfData.length).toFixed(2))
            : months * 720,
          byCategory: mtbfData,
        },
      },
      costs: {
        totalEstimated: totalEstimatedCost,
        totalActual: totalActualCost,
        variance: costVariance,
        isOverBudget: costVariance > 0,
        monthly: monthlyTrends.map(m => ({
          month: m.month,
          estimated: m.estimatedCost,
          actual: m.actualCost,
        })),
      },
      inventory: {
        turnover: inventoryTurnoverData,
        summary: {
          totalReceipts: inventoryTurnoverData.reduce((sum, m) => sum + m.receipts, 0),
          totalIssues: inventoryTurnoverData.reduce((sum, m) => sum + m.issues, 0),
          avgTurnover: inventoryTurnoverData.reduce((sum, m) => sum + m.turnover, 0) / months,
        },
      },
      assets: {
        utilization: {
          rate: utilizationRate,
          operational: operationalCount,
          underRepair: underRepairCount,
          total: totalAssets,
          byStatus: Object.entries(utilizationByStatus).map(([status, count]) => ({
            status,
            count,
            percentage: totalAssets > 0 ? Number(((count / totalAssets) * 100).toFixed(1)) : 0,
          })),
        },
        byCategory: assetUtilizationByCategory,
      },
      period: {
        months,
        startDate: sixMonthsAgo.toISOString(),
        endDate: now.toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };

    return apiSuccess(analytics);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return apiError('Failed to fetch analytics data', 500);
  }
}
