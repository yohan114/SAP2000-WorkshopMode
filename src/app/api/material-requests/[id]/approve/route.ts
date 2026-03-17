import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { triggerWebhook } from '@/lib/webhook-service';
import { z } from 'zod';

const approveSchema = z.object({
  approverId: z.string().min(1),
  notes: z.string().optional(),
  lineApprovals: z.array(z.object({
    lineId: z.string(),
    approvedQty: z.number().positive(),
  })).optional(),
});

const rejectSchema = z.object({
  rejectorId: z.string().min(1),
  reason: z.string().min(1, 'Rejection reason is required'),
});

// POST - Approve or Reject MR
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if this is an approval or rejection
    const isApproval = !body.reason;

    if (isApproval) {
      const result = approveSchema.safeParse(body);
      if (!result.success) {
        return apiError('Validation failed', 400, result.error.issues[0]?.message);
      }

      const { approverId, notes, lineApprovals } = result.data;

      // Get current MR
      const mr = await db.materialRequest.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!mr) {
        return apiError('Material request not found', 404);
      }

      if (mr.status !== 'PENDING_APPROVAL') {
        return apiError('Only pending requests can be approved', 400);
      }

      // Update lines with approved quantities if provided
      if (lineApprovals && lineApprovals.length > 0) {
        for (const lineApproval of lineApprovals) {
          const line = mr.lines.find(l => l.id === lineApproval.lineId);
          if (line) {
            if (lineApproval.approvedQty > line.requestedQty.toNumber()) {
              return apiError(
                `Approved quantity cannot exceed requested quantity for line ${line.lineNumber}`,
                400
              );
            }
            await db.mrLine.update({
              where: { id: lineApproval.lineId },
              data: {
                approvedQty: lineApproval.approvedQty,
                status: lineApproval.approvedQty > 0 ? 'APPROVED' : 'REJECTED',
              },
            });
          }
        }
      } else {
        // Auto-approve all lines with full requested quantity
        // Need to update each line individually since SQLite doesn't support field-to-field updates
        for (const line of mr.lines) {
          await db.mrLine.update({
            where: { id: line.id },
            data: {
              approvedQty: line.requestedQty.toNumber(),
              status: 'APPROVED',
            },
          });
        }
      }

      // Update MR and create transition
      const [updatedMR, approval, transition] = await db.$transaction([
        db.materialRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: approverId,
          },
          include: {
            jobCard: { select: { id: true, jobCardNumber: true } },
            requestor: { select: { id: true, name: true } },
            lines: {
              include: {
                item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
              },
            },
          },
        }),
        db.mrApprovalHistory.create({
          data: {
            mrId: id,
            approverId: approverId,
            approvalLevel: 1,
            status: 'APPROVED',
            comments: notes,
            approvedAt: new Date(),
          },
        }),
        db.mrStateTransition.create({
          data: {
            mrId: id,
            fromState: 'PENDING_APPROVAL',
            toState: 'APPROVED',
            transitionType: 'APPROVE',
            actorId: approverId,
            reason: notes,
          },
        }),
      ]);

      return apiSuccess({
        materialRequest: updatedMR,
        approval,
      }, 'Material request approved successfully');

    } else {
      // Rejection flow
      const result = rejectSchema.safeParse(body);
      if (!result.success) {
        return apiError('Validation failed', 400, result.error.issues[0]?.message);
      }

      const { rejectorId, reason } = result.data;

      // Get current MR
      const mr = await db.materialRequest.findUnique({
        where: { id },
      });

      if (!mr) {
        return apiError('Material request not found', 404);
      }

      if (mr.status !== 'PENDING_APPROVAL') {
        return apiError('Only pending requests can be rejected', 400);
      }

      // Update MR and create transition
      const [updatedMR, approval, transition] = await db.$transaction([
        db.materialRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: reason,
          },
          include: {
            jobCard: { select: { id: true, jobCardNumber: true } },
            requestor: { select: { id: true, name: true } },
            lines: {
              include: {
                item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
              },
            },
          },
        }),
        db.mrApprovalHistory.create({
          data: {
            mrId: id,
            approverId: rejectorId,
            approvalLevel: 1,
            status: 'REJECTED',
            comments: reason,
            approvedAt: new Date(),
          },
        }),
        db.mrStateTransition.create({
          data: {
            mrId: id,
            fromState: 'PENDING_APPROVAL',
            toState: 'REJECTED',
            transitionType: 'REJECT',
            actorId: rejectorId,
            reason: reason,
          },
        }),
        // Reject all lines
        db.mrLine.updateMany({
          where: { mrId: id },
          data: { status: 'REJECTED' },
        }),
      ]);

      return apiSuccess({
        materialRequest: updatedMR,
      }, 'Material request rejected');
    }
  } catch (error) {
    console.error('MR approval error:', error);
    return apiError('Failed to process approval', 500);
  }
}
