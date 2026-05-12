/**
 * Job Card Approvals Queue API Route
 * 
 * This endpoint provides the approval queue for job cards,
 * listing items pending approval for the current user.
 */

import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip } from '@/lib/api-utils';
import {
  checkSlaStatus,
  getEscalationLevel,
} from '@/lib/job-card-state-machine';
import { hasPrivilege } from '@/lib/privileges';

/**
 * GET /api/job-cards/approvals
 * 
 * List job cards pending approval for current user.
 * 
 * Query parameters:
 * - userId: The user ID to check pending approvals for (required)
 * - priority: Filter by priority (optional)
 * - department: Filter by department (optional)
 * - slaStatus: Filter by SLA status (optional: ON_TRACK, AT_RISK, BREACHED)
 * - page: Page number
 * - limit: Items per page
 * 
 * Returns:
 * - List of job cards pending approval
 * - Summary statistics
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Get required userId
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return apiError('userId query parameter is required', 400);
    }

    // Verify user exists and is active
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, department: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return apiError('User not found or inactive', 404);
    }

    // Check if user has approval privilege
    const canApprove = await hasPrivilege(userId, 'JC_APPROVE');

    // Get additional filters
    const priorityFilter = url.searchParams.get('priority');
    const departmentFilter = url.searchParams.get('department');
    const slaStatusFilter = url.searchParams.get('slaStatus');

    // Build where clause for pending job cards
    const where: Record<string, unknown> = {
      status: 'PENDING',
      isActive: true,
      createdBy: { not: userId }, // User cannot approve their own job cards
    };

    if (priorityFilter) {
      where.priority = priorityFilter;
    }

    // Fetch pending job cards that user can approve
    const pendingJobCards = await db.jobCard.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : [
        { priority: 'desc' }, // EMERGENCY first
        { createdAt: 'asc' }, // Oldest first
      ],
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            category: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        technicianAssignments: {
          where: { isActive: true },
          include: {
            technician: {
              select: { id: true, name: true, employeeId: true },
            },
          },
        },
        approvals: {
          where: { approverId: userId },
          select: { id: true, status: true, comments: true, createdAt: true },
        },
        _count: {
          select: { tasks: true, materialRequests: true },
        },
      },
    });

    // Filter by SLA status if specified
    let filteredJobCards = pendingJobCards;
    if (slaStatusFilter) {
      filteredJobCards = pendingJobCards.filter(jc => {
        const slaStatus = checkSlaStatus(jc);
        return slaStatus === slaStatusFilter;
      });
    }

    // Filter by department if specified
    if (departmentFilter) {
      filteredJobCards = filteredJobCards.filter(jc => 
        jc.creator?.department === departmentFilter
      );
    }

    // Filter by approval authority (user's max amount)
    const userApprovePrivilege = await db.userRole.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          isActive: true,
          privileges: {
            some: {
              privilege: { code: 'JC_APPROVE' },
              isGranted: true,
            },
          },
        },
      },
      include: {
        role: {
          include: {
            privileges: {
              where: {
                privilege: { code: 'JC_APPROVE' },
                isGranted: true,
              },
              include: { privilege: true },
            },
          },
        },
      },
    });

    const maxApprovalAmount = userApprovePrivilege?.role.privileges[0]?.maxAmount 
      ? Number(userApprovePrivilege.role.privileges[0].maxAmount)
      : null;

    // Filter by approval authority if user has amount limit
    if (maxApprovalAmount !== null) {
      filteredJobCards = filteredJobCards.filter(jc => {
        const estimatedCost = jc.estimatedCost ? Number(jc.estimatedCost) : 0;
        return estimatedCost <= maxApprovalAmount;
      });
    }

    // Calculate SLA info for each job card
    const jobCardsWithSla = filteredJobCards.map(jc => {
      const slaStatus = checkSlaStatus(jc);
      const escalationLevel = getEscalationLevel(jc);
      
      return {
        id: jc.id,
        jobCardNumber: jc.jobCardNumber,
        asset: jc.asset,
        priority: jc.priority,
        status: jc.status,
        faultDescription: jc.faultDescription,
        estimatedCost: jc.estimatedCost ? Number(jc.estimatedCost) : null,
        estimatedDuration: jc.estimatedDuration,
        scheduledStart: jc.scheduledStart,
        scheduledEnd: jc.scheduledEnd,
        createdAt: jc.createdAt,
        creator: jc.creator,
        technicians: jc.technicianAssignments.map(ta => ta.technician),
        taskCount: jc._count.tasks,
        materialRequestCount: jc._count.materialRequests,
        existingApproval: jc.approvals[0] || null,
        sla: {
          status: slaStatus,
          escalationLevel,
        },
      };
    });

    // Get total count for pagination
    const total = await db.jobCard.count({ where });

    // Get summary statistics
    const summary = await getApprovalSummary(userId);

    return apiPaginated(jobCardsWithSla, total, page, limit);
  } catch (error) {
    console.error('Approvals fetch error:', error);
    return apiError('Failed to fetch approval queue', 500);
  }
}

/**
 * Get summary statistics for approval queue
 */
async function getApprovalSummary(userId: string) {
  // Count pending approvals by priority
  const pendingByPriority = await db.jobCard.groupBy({
    by: ['priority'],
    where: {
      status: 'PENDING',
      isActive: true,
      createdBy: { not: userId },
    },
    _count: { id: true },
  });

  // Count by SLA status
  const allPending = await db.jobCard.findMany({
    where: {
      status: 'PENDING',
      isActive: true,
      createdBy: { not: userId },
    },
    select: {
      id: true,
      status: true,
      priority: true,
      createdAt: true,
      actualStart: true,
      actualEnd: true,
    },
  });

  let onTrack = 0;
  let atRisk = 0;
  let breached = 0;

  for (const jc of allPending) {
    const slaStatus = checkSlaStatus(jc);
    switch (slaStatus) {
      case 'ON_TRACK':
        onTrack++;
        break;
      case 'AT_RISK':
        atRisk++;
        break;
      case 'BREACHED':
        breached++;
        break;
    }
  }

  // Get escalation counts
  let escalated = 0;
  for (const jc of allPending) {
    const level = getEscalationLevel(jc);
    if (level !== 'NONE') {
      escalated++;
    }
  }

  // Average wait time
  const now = new Date();
  const totalWaitMs = allPending.reduce((sum, jc) => {
    return sum + (now.getTime() - new Date(jc.createdAt).getTime());
  }, 0);
  const avgWaitHours = allPending.length > 0 
    ? Math.floor(totalWaitMs / (allPending.length * 1000 * 60 * 60))
    : 0;

  return {
    total: allPending.length,
    byPriority: pendingByPriority.reduce((acc, item) => {
      acc[item.priority] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
    bySlaStatus: {
      onTrack,
      atRisk,
      breached,
    },
    escalated,
    avgWaitHours,
  };
}
