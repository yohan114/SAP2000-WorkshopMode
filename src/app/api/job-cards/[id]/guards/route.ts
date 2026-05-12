/**
 * Job Card Guard Conditions API Route
 * 
 * This endpoint checks what transitions are available for a job card
 * based on the current state and guard conditions. It returns
 * boolean flags for each possible transition along with any
 * missing requirements.
 */

import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import {
  canSubmit,
  canApprove,
  canReject,
  canReturn,
  canStartWork,
  canHold,
  canResume,
  canComplete,
  canReopen,
  canClose,
  canCancel,
  VALID_TRANSITIONS,
  JobCardStatus,
  TransitionType,
  GuardCheckResult,
  JobCardForStateMachine,
} from '@/lib/job-card-state-machine';

// Map transition types to guard check functions
const guardCheckFunctions: Record<TransitionType, (
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[],
  reason?: string
) => Promise<GuardCheckResult>> = {
  'SUBMIT': canSubmit as any,
  'APPROVE': canApprove as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[]) => Promise<GuardCheckResult>,
  'REJECT': canReject as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[], reason?: string) => Promise<GuardCheckResult>,
  'RETURN': canReturn as any,
  'START': canStartWork,
  'HOLD': canHold as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[], reason?: string) => Promise<GuardCheckResult>,
  'RESUME': canResume as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[]) => Promise<GuardCheckResult>,
  'COMPLETE': canComplete,
  'REOPEN': canReopen as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[], reason?: string) => Promise<GuardCheckResult>,
  'CLOSE': canClose as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[]) => Promise<GuardCheckResult>,
  'CANCEL': canCancel as (jobCard: JobCardForStateMachine, userId: string, userPrivileges?: string[], reason?: string) => Promise<GuardCheckResult>,
};

// Transitions that require reason parameter for checking
const transitionsRequiringReason: Set<TransitionType> = new Set([
  'REJECT',
  'RETURN',
  'HOLD',
  'REOPEN',
  'CANCEL',
]);

import { getCurrentUser } from '@/lib/auth/session';

/**
 * GET /api/job-cards/[id]/guards
 * 
 * Check what transitions are available for the current job card.
 * 
 * Query parameters:
 * - userId: The user ID to check privileges for (required, can be 'current')
 * - reason: The reason to validate for reason-requiring transitions (optional)
 * 
 * Returns:
 * - Object with boolean flags for each possible transition
 * - Missing requirements for each blocked transition
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    let userId = url.searchParams.get('userId');
    const reason = url.searchParams.get('reason') || undefined;

    if (userId === 'current') {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return apiError('Authentication required', 401);
      }
      userId = currentUser.id;
    }

    if (!userId) {
      return apiError('userId query parameter is required', 400);
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return apiError('User not found or inactive', 404);
    }

    // Fetch job card with all related data needed for guard checks
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      include: {
        asset: {
          include: { qrCodes: true },
        },
        tasks: {
          select: {
            id: true,
            isMandatory: true,
            isComplete: true,
            requiresPhoto: true,
            photoCount: true,
          },
        },
        technicianAssignments: {
          where: { isActive: true },
          select: {
            id: true,
            technicianId: true,
            role: true,
          },
        },
        materialRequests: {
          where: { status: { notIn: ['CLOSED', 'CANCELLED', 'REJECTED'] } },
          select: { id: true, status: true },
        },
        toolLoans: {
          where: { loanStatus: 'ACTIVE' },
          select: { id: true, loanStatus: true, returnedAt: true },
        },
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            fromState: true,
            toState: true,
            transitionType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    const currentStatus = jobCard.status as JobCardStatus;
    const validTransitions = VALID_TRANSITIONS[currentStatus] || [];

    // Get user's privileges for approval/hold/cancel checks
    const userPrivileges = await getUserPrivilegeCodes(userId);

    // Transform job card to match the expected type
    const jobCardForCheck: JobCardForStateMachine = {
      id: jobCard.id,
      jobCardNumber: jobCard.jobCardNumber,
      status: jobCard.status,
      priority: jobCard.priority,
      assetId: jobCard.assetId,
      faultDescription: jobCard.faultDescription,
      estimatedCost: jobCard.estimatedCost,
      createdBy: jobCard.createdBy,
      actualStart: jobCard.actualStart,
      actualEnd: jobCard.actualEnd,
      meterReadingStart: jobCard.meterReadingStart,
      meterReadingEnd: jobCard.meterReadingEnd,
      closedAt: jobCard.closedAt,
      cancelledAt: jobCard.cancelledAt,
      reopenedAt: jobCard.reopenedAt,
      createdAt: jobCard.createdAt,
      scheduledStart: jobCard.scheduledStart,
      scheduledEnd: jobCard.scheduledEnd,
      asset: jobCard.asset ? {
        id: jobCard.asset.id,
        assetNumber: jobCard.asset.assetNumber,
        qrCodes: jobCard.asset.qrCodes?.map(q => ({ id: q.id, qrCode: q.qrCode })) || [],
      } : null,
      tasks: jobCard.tasks,
      technicianAssignments: jobCard.technicianAssignments,
      materialRequests: jobCard.materialRequests,
      toolLoans: jobCard.toolLoans,
      stateTransitions: jobCard.stateTransitions,
    };

    // Check each valid transition
    const guardResults: Record<string, {
      canProceed: boolean;
      reason?: string;
      missingRequirements?: string[];
    }> = {};

    for (const transition of validTransitions) {
      const checkFn = guardCheckFunctions[transition];
      
      if (!checkFn) {
        guardResults[transition] = {
          canProceed: false,
          reason: 'Unknown transition type',
        };
        continue;
      }

      // Pass reason only for transitions that require it
      const checkReason = transitionsRequiringReason.has(transition) ? reason : undefined;
      
      try {
        const result = await checkFn(
          jobCardForCheck,
          userId,
          userPrivileges,
          checkReason
        );
        
        guardResults[transition] = {
          canProceed: result.canProceed,
          reason: result.reason,
          missingRequirements: result.missingRequirements,
        };
      } catch (error) {
        guardResults[transition] = {
          canProceed: false,
          reason: 'Error checking guard conditions',
        };
      }
    }

    // Build response with additional context
    const response = {
      jobCardId: jobCard.id,
      jobCardNumber: jobCard.jobCardNumber,
      currentStatus: jobCard.status,
      validTransitions: validTransitions.map(t => ({
        type: t,
        ...guardResults[t],
      })),
      // Quick lookup for UI
      can: {
        submit: guardResults['SUBMIT']?.canProceed ?? false,
        approve: guardResults['APPROVE']?.canProceed ?? false,
        reject: guardResults['REJECT']?.canProceed ?? false,
        return: guardResults['RETURN']?.canProceed ?? false,
        start: guardResults['START']?.canProceed ?? false,
        hold: guardResults['HOLD']?.canProceed ?? false,
        resume: guardResults['RESUME']?.canProceed ?? false,
        complete: guardResults['COMPLETE']?.canProceed ?? false,
        reopen: guardResults['REOPEN']?.canProceed ?? false,
        close: guardResults['CLOSE']?.canProceed ?? false,
        cancel: guardResults['CANCEL']?.canProceed ?? false,
      },
      // Context information for UI
      context: {
        hasAsset: !!jobCard.assetId,
        hasTechnician: jobCard.technicianAssignments.length > 0,
        hasSupervisor: jobCard.technicianAssignments.some(a => a.role === 'SUPERVISOR'),
        taskCount: jobCard.tasks.length,
        completedTaskCount: jobCard.tasks.filter(t => t.isComplete).length,
        openMaterialRequestCount: jobCard.materialRequests.filter(
          mr => !['CLOSED', 'CANCELLED', 'REJECTED', 'FULFILLED'].includes(mr.status)
        ).length,
        openToolLoanCount: jobCard.toolLoans.length,
        hasStartMeterReading: jobCard.meterReadingStart !== null,
        hasEndMeterReading: jobCard.meterReadingEnd !== null,
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Guard check error:', error);
    return apiError('Failed to check guard conditions', 500);
  }
}

/**
 * Helper to get user's privilege codes
 */
async function getUserPrivilegeCodes(userId: string): Promise<string[]> {
  try {
    // Get user's role privileges
    const userRoles = await db.userRole.findMany({
      where: {
        userId,
        isActive: true,
        role: { isActive: true },
      },
      include: {
        role: {
          include: {
            privileges: {
              where: { isGranted: true },
              include: { privilege: true },
            },
          },
        },
      },
    });

    const privilegeCodes = new Set<string>();

    for (const ur of userRoles) {
      for (const rp of ur.role.privileges) {
        if (rp.privilege.isActive) {
          privilegeCodes.add(rp.privilege.code);
        }
      }
    }

    // Get user's privilege overrides
    const overrides = await db.userPrivilegeOverride.findMany({
      where: {
        userId,
        privilege: { isActive: true },
      },
      include: { privilege: true },
    });

    for (const override of overrides) {
      if (override.isGranted) {
        privilegeCodes.add(override.privilege.code);
      } else {
        privilegeCodes.delete(override.privilege.code);
      }
    }

    return Array.from(privilegeCodes);
  } catch (error) {
    console.error('Error getting user privileges:', error);
    return [];
  }
}
