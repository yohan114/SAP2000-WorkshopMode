import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Valid state transitions for Purchase Order
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
  'PENDING_APPROVAL': ['APPROVED', 'DRAFT', 'CANCELLED'],
  'APPROVED': ['ISSUED', 'CANCELLED'],
  'ISSUED': ['ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  'ACKNOWLEDGED': ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  'PARTIALLY_RECEIVED': ['RECEIVED'],
  'RECEIVED': ['CLOSED'],
  'CLOSED': [],
  'CANCELLED': [],
};

// Action to status mapping
const actionToStatus: Record<string, Record<string, string>> = {
  'SUBMIT': { 'DRAFT': 'PENDING_APPROVAL' },
  'APPROVE': { 'PENDING_APPROVAL': 'APPROVED' },
  'REJECT': { 'PENDING_APPROVAL': 'DRAFT' },
  'ISSUE': { 'APPROVED': 'ISSUED' },
  'ACKNOWLEDGE': { 'ISSUED': 'ACKNOWLEDGED' },
  'RECEIVE': { 'ISSUED': 'PARTIALLY_RECEIVED', 'ACKNOWLEDGED': 'PARTIALLY_RECEIVED', 'PARTIALLY_RECEIVED': 'RECEIVED' },
  'CLOSE': { 'RECEIVED': 'CLOSED' },
  'CANCEL': { 
    'DRAFT': 'CANCELLED', 
    'PENDING_APPROVAL': 'CANCELLED', 
    'APPROVED': 'CANCELLED',
    'ISSUED': 'CANCELLED',
    'ACKNOWLEDGED': 'CANCELLED'
  },
};

// Transition type mapping
const transitionTypes: Record<string, Record<string, string>> = {
  'DRAFT': { 'PENDING_APPROVAL': 'SUBMIT', 'CANCELLED': 'CANCEL' },
  'PENDING_APPROVAL': { 'APPROVED': 'APPROVE', 'DRAFT': 'REJECT', 'CANCELLED': 'CANCEL' },
  'APPROVED': { 'ISSUED': 'ISSUE', 'CANCELLED': 'CANCEL' },
  'ISSUED': { 'ACKNOWLEDGED': 'ACKNOWLEDGE', 'PARTIALLY_RECEIVED': 'RECEIVE', 'RECEIVED': 'RECEIVE', 'CANCELLED': 'CANCEL' },
  'ACKNOWLEDGED': { 'PARTIALLY_RECEIVED': 'RECEIVE', 'RECEIVED': 'RECEIVE', 'CANCELLED': 'CANCEL' },
  'PARTIALLY_RECEIVED': { 'RECEIVED': 'RECEIVE' },
  'RECEIVED': { 'CLOSED': 'CLOSE' },
};

const transitionSchema = z.object({
  action: z.string().optional(),
  toStatus: z.string().optional(),
  actorId: z.string().optional(),
  comments: z.string().optional(),
  reason: z.string().optional(),
}).refine(data => data.action || data.toStatus, {
  message: 'Either action or toStatus is required',
});

// POST - Transition PO to new status
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = transitionSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { action, toStatus, actorId, comments, reason } = result.data;

    // Get current PO
    const po = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      return apiError('Purchase order not found', 404);
    }

    const fromStatus = po.status;

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
          `Cannot perform '${action}' on a PO in '${fromStatus}' status`
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

    // Update data based on transition
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    };

    if (targetStatus === 'PENDING_APPROVAL') {
      // PO submitted for approval
    }

    if (targetStatus === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = actorId || 'system';
    }

    if (targetStatus === 'ISSUED') {
      updateData.issuedAt = new Date();
    }

    if (targetStatus === 'ACKNOWLEDGED') {
      updateData.acknowledgedAt = new Date();
    }

    if (targetStatus === 'CANCELLED') {
      updateData.isActive = false;
    }

    const updatedPO = await db.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, supplierCode: true, name: true } },
        lines: true,
      },
    });

    return apiSuccess({
      id: updatedPO.id,
      poNumber: updatedPO.poNumber,
      status: updatedPO.status,
      supplier: updatedPO.supplier,
    }, 'Purchase order status updated successfully');
  } catch (error) {
    console.error('PO transition error:', error);
    return apiError('Failed to transition purchase order', 500);
  }
}

// GET - Get transition history for a PO (if we had a POStateTransition model)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get PO amendments as transition history
    const amendments = await db.poAmendment.findMany({
      where: { poId: id },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({
      data: amendments.map(a => ({
        id: a.id,
        amendmentNumber: a.amendmentNumber,
        amendmentType: a.amendmentType,
        reason: a.reason,
        approvedBy: a.approvedBy,
        approvedAt: a.approvedAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get PO transitions error:', error);
    return apiError('Failed to fetch transition history', 500);
  }
}
