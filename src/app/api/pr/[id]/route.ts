import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/pr/[id] - Get single PR details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pr = await db.purchaseRequest.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        prNumber: true,
        department: true,
        requestType: true,
        priority: true,
        status: true,
        procurementChannel: true,
        estimatedValue: true,
        approvedValue: true,
        requiredBy: true,
        justification: true,
        approvedAt: true,
        createdAt: true,
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            itemId: true,
            description: true,
            quantity: true,
            unitOfMeasure: true,
            estimatedCost: true,
            totalEstCost: true,
            status: true,
            notes: true,
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                unitOfMeasure: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
        approvals: {
          select: {
            id: true,
            approvalLevel: true,
            status: true,
            comments: true,
            approvedAt: true,
            approver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { approvalLevel: 'asc' },
        },
      },
    });

    if (!pr) {
      return apiError('Purchase request not found', 404);
    }

    return apiSuccess(pr);
  } catch (error) {
    console.error('Get PR error:', error);
    return apiError('Failed to fetch purchase request', 500);
  }
}

// DELETE /api/pr/[id] - Delete PR (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pr = await db.purchaseRequest.findFirst({
      where: { id, isActive: true },
    });

    if (!pr) {
      return apiError('Purchase request not found', 404);
    }

    if (pr.status !== 'DRAFT') {
      return apiError('Can only delete draft purchase requests', 400);
    }

    await db.purchaseRequest.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ id }, 'Purchase request deleted successfully');
  } catch (error) {
    console.error('Delete PR error:', error);
    return apiError('Failed to delete purchase request', 500);
  }
}
