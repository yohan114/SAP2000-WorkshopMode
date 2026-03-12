import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Valid state transitions for Material Request
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
  'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'DRAFT'],
  'APPROVED': ['PARTIALLY_ISSUED', 'CANCELLED'],
  'PARTIALLY_ISSUED': ['FULFILLED', 'APPROVED'],
  'FULFILLED': ['CLOSED'],
  'REJECTED': ['DRAFT'],
  'CLOSED': [],
  'CANCELLED': [],
};

// Transition type mapping
const transitionTypes: Record<string, Record<string, string>> = {
  'DRAFT': { 'PENDING_APPROVAL': 'SUBMIT', 'CANCELLED': 'CANCEL' },
  'PENDING_APPROVAL': { 'APPROVED': 'APPROVE', 'REJECTED': 'REJECT', 'DRAFT': 'RETURN' },
  'APPROVED': { 'PARTIALLY_ISSUED': 'PARTIAL_ISSUE', 'CANCELLED': 'CANCEL' },
  'PARTIALLY_ISSUED': { 'FULFILLED': 'FULFILL', 'APPROVED': 'RETURN_TO_APPROVED' },
  'FULFILLED': { 'CLOSED': 'CLOSE' },
  'REJECTED': { 'DRAFT': 'RESUBMIT' },
};

const transitionSchema = z.object({
  toStatus: z.string(),
  actorId: z.string(),
  reason: z.string().optional(),
  comments: z.string().optional(),
});

// POST - Transition MR to new status
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

    const { toStatus, actorId, reason, comments } = result.data;

    // Get current MR
    const mr = await db.materialRequest.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!mr) {
      return apiError('Material request not found', 404);
    }

    const fromStatus = mr.status;

    // Validate transition
    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      return apiError(
        `Invalid transition from ${fromStatus} to ${toStatus}`,
        400,
        `Valid transitions from ${fromStatus}: ${validTransitions[fromStatus]?.join(', ') || 'none'}`
      );
    }

    // Get transition type
    const transitionType = transitionTypes[fromStatus]?.[toStatus] || 'TRANSITION';

    // Update data based on transition
    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    if (toStatus === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = actorId;
      // Auto-approve all lines when MR is approved
      await db.mrLine.updateMany({
        where: { mrId: id },
        data: {
          approvedQty: db.mrLine.fields.requestedQty,
          status: 'APPROVED',
        },
      });
    }

    if (toStatus === 'REJECTED') {
      updateData.rejectionReason = reason || comments;
      // Reject all lines
      await db.mrLine.updateMany({
        where: { mrId: id },
        data: { status: 'REJECTED' },
      });
    }

    if (toStatus === 'CANCELLED') {
      // Cancel all lines
      await db.mrLine.updateMany({
        where: { mrId: id },
        data: { status: 'CANCELLED' },
      });
    }

    // Update MR and create transition record
    const [updatedMR, transition] = await db.$transaction([
      db.materialRequest.update({
        where: { id },
        data: updateData,
        include: {
          jobCard: {
            select: { id: true, jobCardNumber: true },
          },
          lines: {
            include: {
              item: {
                select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
              },
            },
          },
        },
      }),
      db.mrStateTransition.create({
        data: {
          mrId: id,
          fromState: fromStatus,
          toState: toStatus,
          transitionType: transitionType,
          actorId: actorId,
          reason: reason,
        },
      }),
    ]);

    return apiSuccess({
      materialRequest: updatedMR,
      transition,
    }, 'Material request status updated successfully');
  } catch (error) {
    console.error('MR transition error:', error);
    return apiError('Failed to transition material request', 500);
  }
}

// GET - Get transition history for an MR
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transitions = await db.mrStateTransition.findMany({
      where: { mrId: id },
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
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get MR transitions error:', error);
    return apiError('Failed to fetch transition history', 500);
  }
}
