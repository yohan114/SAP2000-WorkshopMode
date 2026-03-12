import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Valid state transitions
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['APPROVED', 'CANCELLED'],
  'APPROVED': ['IN_PROGRESS', 'CANCELLED'],
  'IN_PROGRESS': ['COMPLETED', 'ON_HOLD'],
  'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
  'COMPLETED': ['CLOSED'],
  'CLOSED': ['APPROVED'], // Reopen
  'CANCELLED': [],
};

// Action to status mapping
const actionToStatus: Record<string, Record<string, string>> = {
  'SUBMIT': { 'DRAFT': 'APPROVED' },
  'START': { 'APPROVED': 'IN_PROGRESS' },
  'COMPLETE': { 'IN_PROGRESS': 'COMPLETED' },
  'HOLD': { 'IN_PROGRESS': 'ON_HOLD' },
  'RESUME': { 'ON_HOLD': 'IN_PROGRESS' },
  'CLOSE': { 'COMPLETED': 'CLOSED' },
  'REOPEN': { 'CLOSED': 'APPROVED' },
  'CANCEL': { 
    'DRAFT': 'CANCELLED', 
    'APPROVED': 'CANCELLED', 
    'ON_HOLD': 'CANCELLED' 
  },
};

// Transition type mapping
const transitionTypes: Record<string, Record<string, string>> = {
  'DRAFT': { 'APPROVED': 'APPROVE', 'CANCELLED': 'CANCEL' },
  'APPROVED': { 'IN_PROGRESS': 'START', 'CANCELLED': 'CANCEL' },
  'IN_PROGRESS': { 'COMPLETED': 'COMPLETE', 'ON_HOLD': 'HOLD' },
  'ON_HOLD': { 'IN_PROGRESS': 'RESUME', 'CANCELLED': 'CANCEL' },
  'COMPLETED': { 'CLOSED': 'CLOSE' },
  'CLOSED': { 'APPROVED': 'REOPEN' },
};

// Schema for transition - accepts either action OR toStatus
const transitionSchema = z.object({
  action: z.string().optional(),
  toStatus: z.string().optional(),
  actorId: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),  // Frontend sends 'notes' instead of 'comments'
  comments: z.string().optional(),
  workPerformed: z.string().optional(),
}).refine(data => data.action || data.toStatus, {
  message: 'Either action or toStatus is required',
});

// POST - Transition job card to new status
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = transitionSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const { action, toStatus, actorId, reason, notes, comments, workPerformed } = result.data;

    // Get current job card
    const jobCard = await db.jobCard.findUnique({
      where: { id },
    });

    if (!jobCard) {
      return apiError('Job card not found', 404);
    }

    const fromStatus = jobCard.status;

    // Determine target status
    let targetStatus: string | undefined;
    
    if (toStatus) {
      // Direct status provided
      targetStatus = toStatus;
    } else if (action) {
      // Map action to status
      targetStatus = actionToStatus[action]?.[fromStatus];
      if (!targetStatus) {
        return apiError(
          `Invalid action '${action}' for status '${fromStatus}'`,
          400,
          `Cannot perform '${action}' on a job card in '${fromStatus}' status`
        );
      }
    }

    if (!targetStatus) {
      return apiError('Could not determine target status', 400);
    }

    // Validate transition
    if (!validTransitions[fromStatus]?.includes(targetStatus)) {
      return apiError(
        `Invalid transition from ${fromStatus} to ${targetStatus}`,
        400,
        `Valid transitions from ${fromStatus}: ${validTransitions[fromStatus]?.join(', ') || 'none'}`
      );
    }

    // Get transition type
    const transitionType = transitionTypes[fromStatus]?.[targetStatus] || action || 'TRANSITION';

    // Update job card and create transition record
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    };

    // Add status-specific fields
    if (targetStatus === 'IN_PROGRESS') {
      updateData.actualStart = new Date();
    }
    
    if (targetStatus === 'COMPLETED') {
      updateData.actualEnd = new Date();
      if (workPerformed) {
        updateData.workPerformed = workPerformed;
      }
    }
    
    if (targetStatus === 'CLOSED') {
      updateData.closedAt = new Date();
      updateData.closedBy = actorId || 'system';
    }
    
    if (targetStatus === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = actorId || 'system';
      updateData.cancellationReason = reason || notes;
    }
    
    if (targetStatus === 'APPROVED' && fromStatus === 'CLOSED') {
      // Reopen case
      updateData.reopenedAt = new Date();
      updateData.reopenedBy = actorId || 'system';
      updateData.reopenReason = reason || notes;
      updateData.closedAt = null;
      updateData.closedBy = null;
    }

    const [updatedJobCard, transition] = await db.$transaction([
      db.jobCard.update({
        where: { id },
        data: updateData,
        include: {
          asset: {
            select: { id: true, assetNumber: true, name: true },
          },
        },
      }),
      db.jcStateTransition.create({
        data: {
          jobCardId: id,
          fromState: fromStatus,
          toState: targetStatus,
          transitionType: transitionType,
          actorId: actorId || 'system',
          reason: reason || notes,
          comments: comments || notes,
        },
      }),
    ]);

    return apiSuccess({
      jobCard: updatedJobCard,
      transition,
    }, 'Job card status updated successfully');
  } catch (error) {
    console.error('Transition error:', error);
    return apiError('Failed to transition job card', 500);
  }
}

// GET - Get transition history for a job card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transitions = await db.jcStateTransition.findMany({
      where: { jobCardId: id },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({
      data: transitions.map(t => ({
        id: t.id,
        fromState: t.fromState,
        toState: t.toState,
        transitionType: t.transitionType,
        actorId: t.actorId,
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
