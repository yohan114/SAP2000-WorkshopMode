import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

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
  budgetLineId: z.string().optional(), // Optional budget line for commitment
}).refine(data => data.action || data.toStatus, {
  message: 'Either action or toStatus is required',
});

// Helper function to create budget commitment
async function createBudgetCommitment(
  poId: string,
  budgetLineId: string,
  amount: number,
  actorId: string
) {
  // Get the budget line
  const budgetLine = await db.budgetLine.findUnique({
    where: { id: budgetLineId },
  });

  if (!budgetLine) {
    throw new Error('Budget line not found');
  }

  const currentCommitted = Number(budgetLine.committedAmount);
  const currentActual = Number(budgetLine.actualAmount);
  const revisedAmount = budgetLine.revisedAmount ? Number(budgetLine.revisedAmount) : Number(budgetLine.originalAmount);

  // Check if sufficient budget is available
  const available = revisedAmount - currentCommitted - currentActual;
  if (amount > available) {
    throw new Error(`Insufficient budget available. Requested: ${amount}, Available: ${available}`);
  }

  // Create the transaction
  const transaction = await db.budgetTransaction.create({
    data: {
      budgetLineId,
      transactionType: 'COMMITMENT',
      amount: new Decimal(amount),
      referenceType: 'PO',
      referenceId: poId,
      description: `Purchase Order commitment`,
    },
  });

  // Update budget line committed amount
  const newCommittedAmount = new Decimal(currentCommitted + amount);
  const newAvailableAmount = new Decimal(revisedAmount - currentActual - amount);

  await db.budgetLine.update({
    where: { id: budgetLineId },
    data: {
      committedAmount: newCommittedAmount,
      availableAmount: newAvailableAmount,
    },
  });

  return { transaction, budgetLine, newCommittedAmount, newAvailableAmount };
}

// Helper function to release budget commitment
async function releaseBudgetCommitment(poId: string) {
  // Find commitment transaction
  const commitment = await db.budgetTransaction.findFirst({
    where: {
      referenceType: 'PO',
      referenceId: poId,
      transactionType: 'COMMITMENT',
    },
    include: { budgetLine: true },
  });

  if (!commitment) return null;

  const releaseAmount = Number(commitment.amount);
  const currentCommitted = Number(commitment.budgetLine.committedAmount);

  // Create release transaction
  await db.budgetTransaction.create({
    data: {
      budgetLineId: commitment.budgetLineId,
      transactionType: 'RELEASE',
      amount: commitment.amount,
      referenceType: 'PO',
      referenceId: poId,
      description: `Purchase Order cancelled - Release commitment`,
    },
  });

  // Update budget line
  await db.budgetLine.update({
    where: { id: commitment.budgetLineId },
    data: {
      committedAmount: new Decimal(currentCommitted - releaseAmount),
    },
  });

  return { releasedAmount: releaseAmount, budgetLineCode: commitment.budgetLine.code };
}

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

    const { action, toStatus, actorId, comments, reason, budgetLineId } = result.data;

    // Get current PO
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { budgetLine: true },
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

    // Process in transaction
    const updatedPO = await db.$transaction(async (tx) => {
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

        // Create budget commitment if budget line is specified or already assigned
        const effectiveBudgetLineId = budgetLineId || po.budgetLineId;
        if (effectiveBudgetLineId && !po.commitmentCreated) {
          const poAmount = Number(po.totalValue);

          // Get budget line and check availability
          const budgetLine = await tx.budgetLine.findUnique({
            where: { id: effectiveBudgetLineId },
          });

          if (budgetLine) {
            const currentCommitted = Number(budgetLine.committedAmount);
            const currentActual = Number(budgetLine.actualAmount);
            const revisedAmount = budgetLine.revisedAmount
              ? Number(budgetLine.revisedAmount)
              : Number(budgetLine.originalAmount);
            const available = revisedAmount - currentCommitted - currentActual;

            if (poAmount > available) {
              throw new Error(
                `Insufficient budget in ${budgetLine.code}. Required: ${poAmount.toLocaleString()}, Available: ${available.toLocaleString()}`
              );
            }

            // Create commitment transaction
            await tx.budgetTransaction.create({
              data: {
                budgetLineId: effectiveBudgetLineId,
                transactionType: 'COMMITMENT',
                amount: new Decimal(poAmount),
                referenceType: 'PO',
                referenceId: id,
                description: `PO ${po.poNumber} approval commitment`,
              },
            });

            // Update budget line
            await tx.budgetLine.update({
              where: { id: effectiveBudgetLineId },
              data: {
                committedAmount: new Decimal(currentCommitted + poAmount),
                availableAmount: new Decimal(available - poAmount),
              },
            });

            updateData.budgetLineId = effectiveBudgetLineId;
            updateData.commitmentCreated = true;
          }
        }
      }

      if (targetStatus === 'ISSUED') {
        updateData.issuedAt = new Date();
      }

      if (targetStatus === 'ACKNOWLEDGED') {
        updateData.acknowledgedAt = new Date();
      }

      if (targetStatus === 'CANCELLED') {
        updateData.isActive = false;

        // Release budget commitment if exists
        if (po.commitmentCreated && po.budgetLineId) {
          const commitment = await tx.budgetTransaction.findFirst({
            where: {
              referenceType: 'PO',
              referenceId: id,
              transactionType: 'COMMITMENT',
            },
          });

          if (commitment) {
            const releaseAmount = Number(commitment.amount);
            const budgetLine = await tx.budgetLine.findUnique({
              where: { id: po.budgetLineId },
            });

            if (budgetLine) {
              // Create release transaction
              await tx.budgetTransaction.create({
                data: {
                  budgetLineId: po.budgetLineId,
                  transactionType: 'RELEASE',
                  amount: commitment.amount,
                  referenceType: 'PO',
                  referenceId: id,
                  description: `PO ${po.poNumber} cancelled - Release commitment`,
                },
              });

              // Update budget line
              await tx.budgetLine.update({
                where: { id: po.budgetLineId },
                data: {
                  committedAmount: new Decimal(Number(budgetLine.committedAmount) - releaseAmount),
                  availableAmount: new Decimal(Number(budgetLine.availableAmount) + releaseAmount),
                },
              });
            }
          }
        }
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          supplier: { select: { id: true, supplierCode: true, name: true } },
          budgetLine: { select: { id: true, code: true, name: true } },
          lines: true,
        },
      });

      return updated;
    });

    // Build response message
    let message = 'Purchase order status updated successfully';
    if (targetStatus === 'APPROVED' && updatedPO.commitmentCreated) {
      message = `Purchase order approved. Budget commitment of ${Number(po.totalValue).toLocaleString()} created for ${updatedPO.budgetLine?.code || 'budget line'}`;
    } else if (targetStatus === 'CANCELLED' && po.commitmentCreated) {
      message = 'Purchase order cancelled. Budget commitment released.';
    }

    return apiSuccess({
      id: updatedPO.id,
      poNumber: updatedPO.poNumber,
      status: updatedPO.status,
      supplier: updatedPO.supplier,
      budgetLine: updatedPO.budgetLine,
      commitmentCreated: updatedPO.commitmentCreated,
    }, message);
  } catch (error) {
    console.error('PO transition error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to transition purchase order';
    return apiError(errorMessage, 500);
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

    // Get budget transactions for this PO
    const budgetTransactions = await db.budgetTransaction.findMany({
      where: {
        referenceType: 'PO',
        referenceId: id,
      },
      include: {
        budgetLine: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({
      amendments: amendments.map(a => ({
        id: a.id,
        amendmentNumber: a.amendmentNumber,
        amendmentType: a.amendmentType,
        reason: a.reason,
        approvedBy: a.approvedBy,
        approvedAt: a.approvedAt,
        createdAt: a.createdAt,
      })),
      budgetTransactions: budgetTransactions.map(t => ({
        id: t.id,
        type: t.transactionType,
        amount: Number(t.amount),
        budgetLine: t.budgetLine,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get PO transitions error:', error);
    return apiError('Failed to fetch transition history', 500);
  }
}
