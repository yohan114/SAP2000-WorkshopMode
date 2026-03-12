import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Valid state transitions for Material Issue
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['ISSUED', 'CANCELLED'],
  'ISSUED': ['PARTIALLY_RETURNED', 'RETURNED'],
  'PARTIALLY_RETURNED': ['RETURNED'],
  'RETURNED': [],
  'CANCELLED': [],
};

const transitionSchema = z.object({
  toStatus: z.string(),
  actorId: z.string(),
  reason: z.string().optional(),
});

// POST - Transition MI to new status
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

    const { toStatus, actorId, reason } = result.data;

    // Get current MI
    const mi = await db.materialIssue.findUnique({
      where: { id },
    });

    if (!mi) {
      return apiError('Material issue not found', 404);
    }

    const fromStatus = mi.status;

    // Validate transition
    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      return apiError(
        `Invalid transition from ${fromStatus} to ${toStatus}`,
        400
      );
    }

    // Update MI
    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    if (toStatus === 'CANCELLED') {
      updateData.isActive = false;
    }

    const updatedMI = await db.materialIssue.update({
      where: { id },
      data: updateData,
      include: {
        store: { select: { code: true, name: true } },
        issuedTo: { select: { name: true } },
        lines: {
          include: {
            item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
          },
        },
      },
    });

    return apiSuccess({
      id: updatedMI.id,
      miNumber: updatedMI.miNumber,
      status: updatedMI.status,
    }, 'Material issue status updated successfully');
  } catch (error) {
    console.error('MI transition error:', error);
    return apiError('Failed to transition material issue', 500);
  }
}
