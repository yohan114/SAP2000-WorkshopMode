/**
 * Job Card State Transition API Route
 * 
 * This endpoint handles all state transitions for job cards using the
 * state machine module. It ensures:
 * - Valid transitions only
 * - Guard condition checks
 * - Audit logging
 * - Proper error handling
 */

import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiForbidden } from '@/lib/api-utils';
import { triggerWebhooks } from '@/lib/webhook-service';
import {
  transitionJobCard,
  TransitionType,
  VALID_TRANSITIONS,
  TRANSITION_TARGET_STATES,
  JobCardStatus,
} from '@/lib/job-card-state-machine';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';

// Schema for transition request
const transitionSchema = z.object({
  transition: z.enum([
    'SUBMIT', 'APPROVE', 'REJECT', 'RETURN',
    'START', 'HOLD', 'RESUME', 'COMPLETE',
    'REOPEN', 'CLOSE', 'CANCEL'
  ] as const),
  actorId: z.string().min(1, 'Actor ID is required'),
  reason: z.string().optional(),
  meterReading: z.number().optional(),
  comments: z.string().optional(),
  workPerformed: z.string().optional(),
});

// Schema for legacy transition (supports both action and toStatus for backward compatibility)
const legacyTransitionSchema = z.object({
  action: z.string().optional(),
  toStatus: z.string().optional(),
  actorId: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  comments: z.string().optional(),
  workPerformed: z.string().optional(),
  meterReading: z.number().optional(),
}).refine(data => data.action || data.toStatus || data.transition, {
  message: 'Either transition, action, or toStatus is required',
});

/**
 * POST /api/job-cards/[id]/transition
 * 
 * Transition a job card to a new state using the state machine.
 * 
 * Request body:
 * - transition: The type of transition (SUBMIT, APPROVE, REJECT, etc.)
 * - actorId: The user performing the transition
 * - reason: Optional reason for the transition
 * - meterReading: Optional meter reading for START/COMPLETE transitions
 * - comments: Optional additional comments
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check for new state machine format
    let transitionType: TransitionType | undefined;
    let actorId: string;
    let reason: string | undefined;
    let meterReading: number | undefined;
    let comments: string | undefined;

    const currentUser = await getCurrentUser();

    if (body.transition) {
      // New format using state machine
      const result = transitionSchema.safeParse(body);
      if (!result.success) {
        return apiError('Validation failed', 400, result.error.issues[0]?.message);
      }
      
      transitionType = result.data.transition;
      actorId = currentUser?.id || result.data.actorId;
      reason = result.data.reason;
      meterReading = result.data.meterReading;
      comments = result.data.comments;
    } else {
      // Legacy format - map to state machine format
      const result = legacyTransitionSchema.safeParse(body);
      if (!result.success) {
        return apiError('Validation failed', 400, result.error.issues[0]?.message);
      }

      const data = result.data;
      actorId = currentUser?.id || data.actorId || 'unknown';
      reason = data.reason || data.notes;
      comments = data.comments || data.notes;
      meterReading = data.meterReading;

      // Get current job card to determine transition type
      const jobCard = await db.jobCard.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!jobCard) {
        return apiNotFound('Job card');
      }

      if (data.action) {
        // Map action to transition type
        const actionToTransition: Record<string, TransitionType> = {
          'SUBMIT': 'SUBMIT',
          'APPROVE': 'APPROVE',
          'REJECT': 'REJECT',
          'RETURN': 'RETURN',
          'START': 'START',
          'HOLD': 'HOLD',
          'RESUME': 'RESUME',
          'COMPLETE': 'COMPLETE',
          'REOPEN': 'REOPEN',
          'CLOSE': 'CLOSE',
          'CANCEL': 'CANCEL',
        };
        transitionType = actionToTransition[data.action];
      } else if (data.toStatus) {
        // Infer transition type from target status
        const currentStatus = jobCard.status as JobCardStatus;
        const validTransitions = VALID_TRANSITIONS[currentStatus] || [];
        
        for (const t of validTransitions) {
          if (TRANSITION_TARGET_STATES[t] === data.toStatus) {
            transitionType = t;
            break;
          }
        }

        if (!transitionType) {
          return apiError(
            `Cannot transition from ${currentStatus} to ${data.toStatus}`,
            400,
            `Valid transitions from ${currentStatus}: ${validTransitions.map(t => TRANSITION_TARGET_STATES[t]).join(', ')}`
          );
        }
      }
    }

    if (!transitionType) {
      return apiError('Could not determine transition type', 400);
    }

    // Execute transition using state machine
    const transitionResult = await transitionJobCard(id, transitionType, actorId, {
      reason,
      meterReading,
      comments,
    });

    if (!transitionResult.success) {
      // Determine appropriate error code
      const errorMessage = transitionResult.error || 'Transition failed';
      if (errorMessage.includes('permission') || errorMessage.includes('privilege')) {
        return apiForbidden(errorMessage);
      }
      if (errorMessage.includes('not found')) {
        return apiNotFound('Job card');
      }
      return apiError(errorMessage, 400);
    }

    // Fetch updated job card with relations
    const updatedJobCard = await db.jobCard.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            status: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        technicianAssignments: {
          where: { isActive: true },
          include: {
            technician: {
              select: { id: true, name: true, employeeId: true },
            },
          },
        },
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Trigger webhook for job card status change
    const webhookEvents: Record<JobCardStatus, string> = {
      'PENDING': 'JOB_CARD_SUBMITTED',
      'APPROVED': 'JOB_CARD_APPROVED',
      'IN_PROGRESS': 'JOB_CARD_STARTED',
      'COMPLETED': 'JOB_CARD_COMPLETED',
      'CLOSED': 'JOB_CARD_CLOSED',
      'ON_HOLD': 'JOB_CARD_HOLD',
      'CANCELLED': 'JOB_CARD_CANCELLED',
      'REJECTED': 'JOB_CARD_REJECTED',
      'DRAFT': 'JOB_CARD_RETURNED',
    };

    if (updatedJobCard && transitionResult.newState) {
      const event = webhookEvents[transitionResult.newState];
      if (event) {
        await triggerWebhooks(event, {
          id: updatedJobCard.id,
          jobCardNumber: updatedJobCard.jobCardNumber,
          status: updatedJobCard.status,
          previousStatus: transitionResult,
          assetId: updatedJobCard.assetId,
          assetNumber: updatedJobCard.asset.assetNumber,
          assetName: updatedJobCard.asset.name,
          transitionType,
          actorId,
          reason,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return apiSuccess({
      jobCard: updatedJobCard,
      transition: {
        id: transitionResult.transitionId,
        newState: transitionResult.newState,
        transitionType,
      },
    }, 'Job card status updated successfully');
  } catch (error) {
    console.error('Transition error:', error);
    return apiError('Failed to transition job card', 500);
  }
}

/**
 * GET /api/job-cards/[id]/transition
 * 
 * Get transition history for a job card.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Get all transitions
    const transitions = await db.jcStateTransition.findMany({
      where: { jobCardId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
      },
    });

    // Get available transitions from current state
    const availableTransitions = VALID_TRANSITIONS[jobCard.status as JobCardStatus] || [];

    return apiSuccess({
      currentStatus: jobCard.status,
      availableTransitions: availableTransitions.map(t => ({
        type: t,
        targetState: TRANSITION_TARGET_STATES[t],
      })),
      history: transitions.map(t => ({
        id: t.id,
        fromState: t.fromState,
        toState: t.toState,
        transitionType: t.transitionType,
        actor: t.actor,
        reason: t.reason,
        comments: t.comments,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get transitions error:', error);
    return apiError('Failed to fetch transition history', 500);
  }
}
