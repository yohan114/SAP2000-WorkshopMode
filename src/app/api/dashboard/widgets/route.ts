import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/dashboard/widgets - Get dashboard widgets data
export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Run all queries in parallel
    const [
      todaysCompletedJobs,
      jobsDueToday,
      overduePmSchedules,
      pendingApprovals,
      topTechnicians,
      assetsByStatus,
      lowStockItems,
      emergencyJobCards,
      overdueJobCards,
      weeklyActivity,
    ] = await Promise.all([
      // Today's completed jobs
      db.jobCard.count({
        where: {
          status: { in: ['COMPLETED', 'CLOSED'] },
          actualEnd: { gte: startOfToday },
          isActive: true,
        },
      }),

      // Jobs due today (scheduled end today)
      db.jobCard.count({
        where: {
          scheduledEnd: { 
            gte: startOfToday,
            lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
          },
          status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS'] },
          isActive: true,
        },
      }),

      // Overdue PM schedules
      db.pmSchedule.count({
        where: {
          nextExecutionAt: { lt: startOfToday },
          isActive: true,
        },
      }).catch(() => 0), // Return 0 if table doesn't exist

      // Pending approvals (MR approvals + Job Card approvals)
      Promise.all([
        db.materialRequest.count({
          where: { status: 'PENDING_APPROVAL', isActive: true },
        }),
        db.jobCardApproval.count({
          where: { status: 'PENDING' },
        }),
      ]),

      // Top technicians by jobs completed this month
      db.jcTechnicianAssignment.findMany({
        where: {
          isActive: true,
          jobCard: {
            status: { in: ['COMPLETED', 'CLOSED'] },
            actualEnd: { gte: startOfMonth, lte: endOfMonth },
            isActive: true,
          },
        },
        include: {
          technician: {
            select: { id: true, name: true, employeeId: true },
          },
          jobCard: {
            select: { actualDuration: true },
          },
        },
      }),

      // Assets by status
      db.asset.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: true,
      }),

      // Low stock items with details
      db.$queryRaw<Array<{ 
        id: string; 
        itemCode: string; 
        name: string; 
        availableQty: number; 
        reorderLevel: number; 
        storeName: string;
      }>>`
        SELECT 
          Item.id,
          Item.itemCode,
          Item.name,
          CAST(StoreStock.availableQty AS REAL) as availableQty,
          CAST(Item.reorderLevel AS REAL) as reorderLevel,
          Store.name as storeName
        FROM StoreStock
        INNER JOIN Item ON StoreStock.itemId = Item.id
        INNER JOIN Store ON StoreStock.storeId = Store.id
        WHERE StoreStock.availableQty <= Item.reorderLevel 
          AND Item.reorderLevel IS NOT NULL
          AND StoreStock.availableQty > 0
        ORDER BY (StoreStock.availableQty * 1.0 / Item.reorderLevel) ASC
        LIMIT 10
      `,

      // Emergency job cards
      db.jobCard.findMany({
        where: {
          priority: 'EMERGENCY',
          status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS'] },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          jobCardNumber: true,
          faultDescription: true,
          status: true,
          createdAt: true,
          asset: { select: { name: true } },
        },
      }),

      // Overdue job cards (past scheduled end)
      db.jobCard.findMany({
        where: {
          scheduledEnd: { lt: startOfToday },
          status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS'] },
          isActive: true,
        },
        orderBy: { scheduledEnd: 'asc' },
        take: 5,
        select: {
          id: true,
          jobCardNumber: true,
          status: true,
          scheduledEnd: true,
          asset: { select: { name: true } },
        },
      }),

      // Weekly activity - jobs created/completed by day
      Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const day = new Date(startOfWeek);
          day.setDate(day.getDate() + i);
          const dayStart = new Date(day);
          const dayEnd = new Date(day);
          dayEnd.setDate(dayEnd.getDate() + 1);

          const [created, completed] = await Promise.all([
            db.jobCard.count({
              where: {
                createdAt: { gte: dayStart, lt: dayEnd },
                isActive: true,
              },
            }),
            db.jobCard.count({
              where: {
                status: { in: ['COMPLETED', 'CLOSED'] },
                actualEnd: { gte: dayStart, lt: dayEnd },
                isActive: true,
              },
            }),
          ]);

          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return {
            day: dayNames[i],
            date: day.toISOString().split('T')[0],
            created,
            completed,
          };
        })
      ),
    ]);

    // Process top technicians
    const technicianStats = new Map<string, {
      id: string;
      name: string;
      employeeId: string | null;
      jobsCompleted: number;
      totalDuration: number;
    }>();

    topTechnicians.forEach((assignment) => {
      const techId = assignment.technicianId;
      const existing = technicianStats.get(techId) || {
        id: techId,
        name: assignment.technician.name,
        employeeId: assignment.technician.employeeId,
        jobsCompleted: 0,
        totalDuration: 0,
      };
      existing.jobsCompleted += 1;
      if (assignment.jobCard.actualDuration) {
        existing.totalDuration += Number(assignment.jobCard.actualDuration);
      }
      technicianStats.set(techId, existing);
    });

    const topTechniciansList = Array.from(technicianStats.values())
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
      .slice(0, 5)
      .map(tech => ({
        ...tech,
        avgCompletionTime: tech.jobsCompleted > 0 
          ? Number((tech.totalDuration / tech.jobsCompleted).toFixed(1))
          : 0,
      }));

    // Calculate total assets for percentage
    const totalAssets = assetsByStatus.reduce((sum, a) => sum + a._count, 0);

    // Format assets by status
    const fleetStatus = assetsByStatus.map(a => ({
      status: a.status,
      count: a._count,
      percentage: totalAssets > 0 ? Number(((a._count / totalAssets) * 100).toFixed(1)) : 0,
    }));

    // Build alerts data
    const alerts = {
      lowStock: lowStockItems.map(item => ({
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        availableQty: Number(item.availableQty),
        reorderLevel: Number(item.reorderLevel),
        storeName: item.storeName,
        type: 'LOW_STOCK' as const,
      })),
      emergencyJobs: emergencyJobCards.map(job => ({
        id: job.id,
        jobCardNumber: job.jobCardNumber,
        assetName: job.asset?.name || 'Unknown',
        description: job.faultDescription,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        type: 'EMERGENCY_JOB' as const,
      })),
      overdueJobs: overdueJobCards.map(job => ({
        id: job.id,
        jobCardNumber: job.jobCardNumber,
        assetName: job.asset?.name || 'Unknown',
        status: job.status,
        scheduledEnd: job.scheduledEnd?.toISOString() || null,
        type: 'OVERDUE_JOB' as const,
      })),
      pendingApprovals: {
        materialRequests: pendingApprovals[0],
        jobCards: pendingApprovals[1],
        total: pendingApprovals[0] + pendingApprovals[1],
      },
    };

    // Build quick actions data
    const quickActions = {
      todaysCompletedJobs,
      jobsDueToday,
      overduePmSchedules,
      pendingApprovals: pendingApprovals[0] + pendingApprovals[1],
    };

    // Resolve weekly activity promises
    const weeklyActivityResult = await Promise.all(weeklyActivity);

    const response = {
      quickActions,
      topTechnicians: topTechniciansList,
      fleetStatus,
      alerts,
      weeklyActivity: weeklyActivityResult,
      generatedAt: new Date().toISOString(),
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Dashboard widgets error:', error);
    return apiError('Failed to fetch dashboard widgets data', 500);
  }
}
