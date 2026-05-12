import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  apiValidationError,
} from '@/lib/api-utils';
import { z } from 'zod';

// DELETE /api/wrong-item-returns/[id] - Soft-delete a wrong item return record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbModel = (db as any).wrongItemReturn;

    // Find existing record
    const existing = await dbModel.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      return apiError('Wrong item return record not found', 404);
    }

    // Soft-delete by setting isActive to false
    const updated = await dbModel.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess(updated, 'Wrong item return record deleted successfully');
  } catch (error) {
    console.error('Delete wrong item return error:', error);
    return apiError('Failed to delete wrong item return record', 500);
  }
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  IDENTIFIED: ['RETURN_INITIATED'],
  RETURN_INITIATED: ['RETURNED', 'REPLACED'],
  RETURNED: ['CLOSED'],
  REPLACED: ['CLOSED'],
};

// Schema for updating wrong item return status
const updateWrongItemReturnSchema = z.object({
  status: z.enum(['IDENTIFIED', 'RETURN_INITIATED', 'RETURNED', 'REPLACED', 'CLOSED']),
  notes: z.string().optional(),
  replacementReceivedAt: z.string().optional(),
});

// PATCH /api/wrong-item-returns/[id] - Update status and timestamps
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateWrongItemReturnSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;
    const dbModel = (db as any).wrongItemReturn;

    // Find existing record
    const existing = await dbModel.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      return apiError('Wrong item return record not found', 404);
    }

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(data.status)) {
      return apiError(
        `Invalid status transition from ${existing.status} to ${data.status}. Allowed: ${allowedTransitions.join(', ')}`,
        400
      );
    }

    // Build update data based on new status
    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const now = new Date();

    // Set timestamp based on status transition
    switch (data.status) {
      case 'RETURN_INITIATED':
        updateData.returnInitiatedAt = now;
        break;
      case 'RETURNED':
      case 'REPLACED':
        updateData.returnCompletedAt = now;
        if (data.status === 'REPLACED' && data.replacementReceivedAt) {
          updateData.replacementReceivedAt = new Date(data.replacementReceivedAt);
        }
        break;
      case 'CLOSED':
        // No additional timestamp for CLOSED
        break;
    }

    // Calculate delay days if return is completed
    if (updateData.returnCompletedAt && existing.identifiedAt) {
      const identifiedDate = new Date(existing.identifiedAt);
      const completedDate = updateData.returnCompletedAt as Date;
      const diffTime = completedDate.getTime() - identifiedDate.getTime();
      updateData.delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const updated = await dbModel.update({
      where: { id },
      data: updateData,
      include: {
        grn: {
          select: {
            id: true,
            grnNumber: true,
          },
        },
      },
    });

    return apiSuccess(updated, 'Wrong item return updated successfully');
  } catch (error) {
    console.error('Update wrong item return error:', error);
    return apiError('Failed to update wrong item return record', 500);
  }
}
