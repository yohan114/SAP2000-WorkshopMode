import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const approvePrSchema = z.object({
  approverId: z.string().min(1, 'Approver ID is required'),
  comments: z.string().optional(),
  action: z.enum(['APPROVE', 'REJECT']).default('APPROVE'),
});

// POST /api/pr/[id]/approve - Approve or reject PR
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = approvePrSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }

    const data = result.data;

    // Get PR
    const pr = await db.purchaseRequest.findFirst({
      where: { id, isActive: true },
      include: {
        approvals: true,
        lines: true,
      },
    });

    if (!pr) {
      return apiError('Purchase request not found', 404);
    }

    if (pr.status !== 'DRAFT' && pr.status !== 'PENDING_APPROVAL') {
      return apiError('PR is not in a state that can be approved', 400);
    }

    const newStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // Update PR status and create approval record
    const updatedPr = await db.purchaseRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedAt: data.action === 'APPROVE' ? new Date() : null,
        approvedBy: data.action === 'APPROVE' ? data.approverId : null,
        approvals: {
          create: {
            approverId: data.approverId,
            approvalLevel: 1,
            status: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            comments: data.comments || null,
            approvedAt: new Date(),
          },
        },
        lines: {
          updateMany: {
            where: { prId: id },
            data: { status: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED' },
          },
        },
      },
      select: {
        id: true,
        prNumber: true,
        status: true,
        approvedAt: true,
        approver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return apiSuccess(updatedPr, `Purchase request ${data.action.toLowerCase()}d successfully`);
  } catch (error) {
    console.error('Approve PR error:', error);
    return apiError('Failed to process approval', 500);
  }
}
