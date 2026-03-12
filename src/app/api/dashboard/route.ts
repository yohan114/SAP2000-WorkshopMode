import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month'; // day, week, month, year

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default: // month
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    // Run all queries in parallel
    const [
      totalAssets,
      operationalAssets,
      underRepairAssets,
      totalJobCards,
      openJobCards,
      completedJobCards,
      emergencyJobCards,
      avgJobCompletionTime,
      totalMRs,
      pendingMRs,
      approvedMRs,
      totalItems,
      lowStockItems,
      totalStockValue,
      totalSuppliers,
      activeSuppliers,
      jobCardsByStatus,
      jobCardsByPriority,
      recentJobCards,
      recentMRs,
      topAssetsByJobCards,
      stockMovements,
    ] = await Promise.all([
      // Asset counts
      db.asset.count({ where: { isActive: true } }),
      db.asset.count({ where: { isActive: true, status: 'OPERATIONAL' } }),
      db.asset.count({ where: { isActive: true, status: 'UNDER_REPAIR' } }),

      // Job card counts
      db.jobCard.count({ where: { isActive: true, createdAt: { gte: startDate } } }),
      db.jobCard.count({ 
        where: { 
          isActive: true, 
          status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
          createdAt: { gte: startDate }
        } 
      }),
      db.jobCard.count({ 
        where: { 
          isActive: true, 
          status: { in: ['COMPLETED', 'CLOSED'] },
          createdAt: { gte: startDate }
        } 
      }),
      db.jobCard.count({ 
        where: { 
          isActive: true, 
          priority: { in: ['EMERGENCY', 'CRITICAL'] },
          status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS'] }
        } 
      }),

      // Average completion time (hours)
      db.jobCard.aggregate({
        where: {
          status: { in: ['COMPLETED', 'CLOSED'] },
          actualStart: { not: null },
          actualEnd: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: {
          actualDuration: true,
        },
      }),

      // MR counts
      db.materialRequest.count({ where: { isActive: true, createdAt: { gte: startDate } } }),
      db.materialRequest.count({ 
        where: { isActive: true, status: { in: ['DRAFT', 'PENDING_APPROVAL'] }, createdAt: { gte: startDate } } 
      }),
      db.materialRequest.count({ 
        where: { isActive: true, status: 'APPROVED', createdAt: { gte: startDate } } 
      }),

      // Inventory counts
      db.item.count({ where: { isActive: true } }),
      // Low stock count - items where available qty <= reorder level
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "StoreStock"
        INNER JOIN "Item" ON "StoreStock"."itemId" = "Item"."id"
        WHERE "StoreStock"."availableQty" <= "Item"."reorderLevel" AND "Item"."reorderLevel" IS NOT NULL
      `,

      // Total stock value
      db.storeStock.aggregate({
        _sum: {
          wac: true,
          availableQty: true,
        },
      }),

      // Supplier counts
      db.supplier.count(),
      db.supplier.count({ where: { status: 'ACTIVE' } }),

      // Job cards by status
      db.jobCard.groupBy({
        by: ['status'],
        where: { isActive: true, createdAt: { gte: startDate } },
        _count: true,
      }),

      // Job cards by priority
      db.jobCard.groupBy({
        by: ['priority'],
        where: { isActive: true, createdAt: { gte: startDate } },
        _count: true,
      }),

      // Recent job cards
      db.jobCard.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          jobCardNumber: true,
          status: true,
          priority: true,
          asset: { select: { name: true } },
          createdAt: true,
        },
      }),

      // Recent MRs
      db.materialRequest.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          mrNumber: true,
          status: true,
          requestor: { select: { name: true } },
          createdAt: true,
        },
      }),

      // Top assets by job card count
      db.asset.findMany({
        where: { isActive: true },
        orderBy: { jobCards: { _count: 'desc' } },
        take: 5,
        select: {
          id: true,
          assetNumber: true,
          name: true,
          status: true,
          _count: { select: { jobCards: true } },
        },
      }),

      // Stock movements
      db.stockTransaction.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    // Calculate stock value
    const stockValue = totalStockValue._sum.wac && totalStockValue._sum.availableQty
      ? Number(totalStockValue._sum.wac) * Number(totalStockValue._sum.availableQty)
      : 0;

    // Extract low stock count from raw query
    const lowStockCount = lowStockItems[0]?.count ? Number(lowStockItems[0].count) : 0;

    // Build response
    const dashboard = {
      summary: {
        assets: {
          total: totalAssets,
          operational: operationalAssets,
          underRepair: underRepairAssets,
          availability: totalAssets > 0 ? ((operationalAssets / totalAssets) * 100).toFixed(1) : '0',
        },
        jobCards: {
          total: totalJobCards,
          open: openJobCards,
          completed: completedJobCards,
          emergency: emergencyJobCards,
          completionRate: totalJobCards > 0 ? ((completedJobCards / totalJobCards) * 100).toFixed(1) : '0',
          avgCompletionHours: avgJobCompletionTime._avg.actualDuration || 0,
        },
        materialRequests: {
          total: totalMRs,
          pending: pendingMRs,
          approved: approvedMRs,
        },
        inventory: {
          totalItems: totalItems,
          lowStockItems: lowStockCount,
          totalValue: stockValue.toFixed(2),
        },
        suppliers: {
          total: totalSuppliers,
          active: activeSuppliers,
        },
        stockMovements,
      },
      charts: {
        jobCardsByStatus: jobCardsByStatus.map(j => ({
          status: j.status,
          count: j._count,
        })),
        jobCardsByPriority: jobCardsByPriority.map(j => ({
          priority: j.priority,
          count: j._count,
        })),
      },
      recent: {
        jobCards: recentJobCards,
        materialRequests: recentMRs,
      },
      topAssets: topAssetsByJobCards.map(a => ({
        id: a.id,
        assetNumber: a.assetNumber,
        name: a.name,
        status: a.status,
        jobCardCount: a._count.jobCards,
      })),
      period,
      generatedAt: new Date().toISOString(),
    };

    return apiSuccess(dashboard);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return apiError('Failed to fetch dashboard statistics', 500);
  }
}
// Updated
// Force rebuild Wed Mar 11 03:26:18 UTC 2026
