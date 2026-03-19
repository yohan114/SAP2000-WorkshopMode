import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/grn/statistics - Get GRN statistics for dashboard
export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month statistics
    const currentMonthGrns = await db.grnHeader.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        isActive: true,
      },
      select: {
        totalValue: true,
        status: true,
        createdAt: true,
        verifiedAt: true,
        postedAt: true,
      },
    });

    // Get last month statistics for comparison
    const lastMonthGrns = await db.grnHeader.findMany({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
        isActive: true,
      },
      select: {
        totalValue: true,
        status: true,
      },
    });

    // Get pending verification count (SUBMITTED status)
    const pendingVerification = await db.grnHeader.count({
      where: {
        status: 'SUBMITTED',
        isActive: true,
      },
    });

    // Get pending inspection count
    const pendingInspection = await db.grnHeader.count({
      where: {
        inspectionStatus: 'REQUESTED',
        isActive: true,
      },
    });

    // Calculate total value this month
    const totalValueThisMonth = currentMonthGrns.reduce(
      (sum, grn) => sum + grn.totalValue.toNumber(),
      0
    );

    // Calculate last month value
    const lastMonthValue = lastMonthGrns.reduce(
      (sum, grn) => sum + grn.totalValue.toNumber(),
      0
    );

    // Calculate average processing time (from creation to posted)
    const postedGrns = await db.grnHeader.findMany({
      where: {
        status: 'POSTED',
        postedAt: { not: null },
        isActive: true,
      },
      select: {
        createdAt: true,
        postedAt: true,
      },
      take: 50,
      orderBy: { postedAt: 'desc' },
    });

    let avgProcessingTime = 0;
    if (postedGrns.length > 0) {
      const totalHours = postedGrns.reduce((sum, grn) => {
        if (grn.postedAt) {
          const diff = grn.postedAt.getTime() - grn.createdAt.getTime();
          return sum + diff / (1000 * 60 * 60); // Convert to hours
        }
        return sum;
      }, 0);
      avgProcessingTime = Math.round(totalHours / postedGrns.length);
    }

    // Get status breakdown
    const statusBreakdown = await db.grnHeader.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: true,
    });

    // Get inspection status breakdown
    const inspectionStatusBreakdown = await db.grnHeader.groupBy({
      by: ['inspectionStatus'],
      where: { isActive: true },
      _count: true,
    });

    // Top suppliers by GRN value this month
    const topSuppliers = await db.grnHeader.groupBy({
      by: ['supplierId'],
      where: {
        createdAt: { gte: startOfMonth },
        isActive: true,
      },
      _sum: {
        totalValue: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalValue: 'desc',
        },
      },
      take: 5,
    });

    // Get supplier details
    const supplierIds = topSuppliers.map((s) => s.supplierId).filter(Boolean) as string[];
    const suppliers = supplierIds.length > 0
      ? await db.supplier.findMany({
          where: { id: { in: supplierIds } },
          select: { id: true, name: true, supplierCode: true },
        })
      : [];

    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    return apiSuccess({
      thisMonth: {
        count: currentMonthGrns.length,
        totalValue: totalValueThisMonth,
        lastMonthValue,
        valueChange: lastMonthValue > 0
          ? ((totalValueThisMonth - lastMonthValue) / lastMonthValue) * 100
          : 0,
      },
      pendingVerification,
      pendingInspection,
      avgProcessingTimeHours: avgProcessingTime,
      avgProcessingTimeDays: Math.round(avgProcessingTime / 24 * 10) / 10,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      inspectionStatusBreakdown: inspectionStatusBreakdown
        .filter((s) => s.inspectionStatus !== null)
        .map((s) => ({
          status: s.inspectionStatus,
          count: s._count,
        })),
      topSuppliers: topSuppliers.map((s) => ({
        supplier: supplierMap.get(s.supplierId) || null,
        totalValue: s._sum.totalValue?.toNumber() || 0,
        grnCount: s._count,
      })),
    });
  } catch (error) {
    console.error('Get GRN statistics error:', error);
    return apiError('Failed to fetch GRN statistics', 500);
  }
}
