import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for bulk status change
const bulkStatusChangeSchema = z.object({
  jobCardIds: z.array(z.string()).min(1, 'At least one job card must be selected'),
  newStatus: z.enum(['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED']),
  notes: z.string().optional(),
});

// Schema for bulk assign technician
const bulkAssignSchema = z.object({
  jobCardIds: z.array(z.string()).min(1, 'At least one job card must be selected'),
  technicianId: z.string().min(1, 'Technician is required'),
  role: z.enum(['TECHNICIAN', 'SUPERVISOR', 'LEAD']).default('TECHNICIAN'),
});

// Schema for bulk delete (soft delete)
const bulkDeleteSchema = z.object({
  jobCardIds: z.array(z.string()).min(1, 'At least one job card must be selected'),
  reason: z.string().optional(),
});

// Schema for bulk cancel
const bulkCancelSchema = z.object({
  jobCardIds: z.array(z.string()).min(1, 'At least one job card must be selected'),
  reason: z.string().min(1, 'Cancellation reason is required'),
});

// Valid status transitions for bulk operations
const validBulkTransitions: Record<string, string[]> = {
  'DRAFT': ['APPROVED', 'CANCELLED'],
  'APPROVED': ['IN_PROGRESS', 'CANCELLED'],
  'IN_PROGRESS': ['ON_HOLD', 'COMPLETED'],
  'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
  'COMPLETED': ['CLOSED'],
  'CLOSED': [],
  'CANCELLED': [],
};

// POST /api/job-cards/bulk - Bulk operations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'CHANGE_STATUS':
        return await handleBulkStatusChange(body);
      case 'ASSIGN_TECHNICIAN':
        return await handleBulkAssign(body);
      case 'DELETE':
        return await handleBulkDelete(body);
      case 'CANCEL':
        return await handleBulkCancel(body);
      default:
        return apiError('Invalid action', 400);
    }
  } catch (error) {
    console.error('Bulk operation error:', error);
    return apiError('Failed to perform bulk operation', 500);
  }
}

async function handleBulkStatusChange(body: Record<string, unknown>) {
  const result = bulkStatusChangeSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { jobCardIds, newStatus, notes } = result.data;

  // Get all job cards
  const jobCards = await db.jobCard.findMany({
    where: { id: { in: jobCardIds }, isActive: true },
    select: { id: true, jobCardNumber: true, status: true },
  });

  if (jobCards.length === 0) {
    return apiError('No active job cards found', 404);
  }

  // Filter job cards that can transition to the new status
  const validJobCards = jobCards.filter(jc => {
    const allowedTransitions = validBulkTransitions[jc.status] || [];
    return allowedTransitions.includes(newStatus);
  });

  if (validJobCards.length === 0) {
    return apiError('No job cards can be transitioned to the selected status', 400);
  }

  const validIds = validJobCards.map(jc => jc.id);
  const skippedCount = jobCardIds.length - validIds.length;

  // Perform bulk update
  await db.$transaction([
    // Update job cards
    ...validIds.map(id =>
      db.jobCard.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === 'IN_PROGRESS' && { actualStart: new Date() }),
          ...(newStatus === 'COMPLETED' && { actualEnd: new Date() }),
          ...(newStatus === 'CLOSED' && { closedAt: new Date() }),
        },
      })
    ),
    // Create state transitions
    ...validJobCards.map(jc =>
      db.jcStateTransition.create({
        data: {
          jobCardId: jc.id,
          fromState: jc.status,
          toState: newStatus,
          transitionType: 'BULK_STATUS_CHANGE',
          actorId: (body.actorId as string) || 'system',
          reason: notes,
        },
      })
    ),
  ]);

  return apiSuccess({
    updated: validIds.length,
    skipped: skippedCount,
    total: jobCardIds.length,
  }, `Successfully updated ${validIds.length} job card(s)${skippedCount > 0 ? `, skipped ${skippedCount} due to invalid status transition` : ''}`);
}

async function handleBulkAssign(body: Record<string, unknown>) {
  const result = bulkAssignSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { jobCardIds, technicianId, role } = result.data;

  // Verify technician exists
  const technician = await db.user.findUnique({
    where: { id: technicianId, isActive: true },
  });

  if (!technician) {
    return apiError('Technician not found', 404);
  }

  // Get all active job cards
  const jobCards = await db.jobCard.findMany({
    where: { id: { in: jobCardIds }, isActive: true },
    select: { id: true, jobCardNumber: true },
  });

  if (jobCards.length === 0) {
    return apiError('No active job cards found', 404);
  }

  // Deactivate existing assignments for these job cards with this technician
  await db.jcTechnicianAssignment.updateMany({
    where: {
      jobCardId: { in: jobCardIds },
      technicianId,
      isActive: true,
    },
    data: { isActive: false },
  });

  // Create new assignments
  await db.$transaction(
    jobCards.map(jc =>
      db.jcTechnicianAssignment.create({
        data: {
          jobCardId: jc.id,
          technicianId,
          role,
          assignedBy: (body.assignedBy as string) || null,
        },
      })
    )
  );

  return apiSuccess({
    assigned: jobCards.length,
    technician: technician.name,
    role,
  }, `Successfully assigned ${technician.name} to ${jobCards.length} job card(s)`);
}

async function handleBulkDelete(body: Record<string, unknown>) {
  const result = bulkDeleteSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { jobCardIds, reason } = result.data;

  // Get all job cards
  const jobCards = await db.jobCard.findMany({
    where: { id: { in: jobCardIds }, isActive: true },
    select: { id: true, jobCardNumber: true, status: true },
  });

  if (jobCards.length === 0) {
    return apiError('No active job cards found', 404);
  }

  // Only allow deletion of DRAFT or CANCELLED job cards
  const deletableJobCards = jobCards.filter(jc =>
    ['DRAFT', 'CANCELLED'].includes(jc.status)
  );

  if (deletableJobCards.length === 0) {
    return apiError('No job cards can be deleted. Only DRAFT or CANCELLED job cards can be deleted.', 400);
  }

  const deletableIds = deletableJobCards.map(jc => jc.id);

  // Soft delete
  await db.jobCard.updateMany({
    where: { id: { in: deletableIds } },
    data: {
      isActive: false,
      deletedAt: new Date(),
      cancellationReason: reason,
    },
  });

  return apiSuccess({
    deleted: deletableIds.length,
    skipped: jobCardIds.length - deletableIds.length,
  }, `Successfully deleted ${deletableIds.length} job card(s)`);
}

async function handleBulkCancel(body: Record<string, unknown>) {
  const result = bulkCancelSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { jobCardIds, reason } = result.data;

  // Get all job cards
  const jobCards = await db.jobCard.findMany({
    where: { id: { in: jobCardIds }, isActive: true },
    select: { id: true, jobCardNumber: true, status: true },
  });

  if (jobCards.length === 0) {
    return apiError('No active job cards found', 404);
  }

  // Filter job cards that can be cancelled
  const cancellableJobCards = jobCards.filter(jc =>
    ['DRAFT', 'APPROVED', 'ON_HOLD'].includes(jc.status)
  );

  if (cancellableJobCards.length === 0) {
    return apiError('No job cards can be cancelled. Only DRAFT, APPROVED, or ON_HOLD job cards can be cancelled.', 400);
  }

  const cancellableIds = cancellableJobCards.map(jc => jc.id);
  const skippedCount = jobCardIds.length - cancellableIds.length;

  // Update job cards and create transitions
  await db.$transaction([
    // Update job cards
    ...cancellableIds.map(id =>
      db.jobCard.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: (body.actorId as string) || null,
          cancellationReason: reason,
        },
      })
    ),
    // Create state transitions
    ...cancellableJobCards.map(jc =>
      db.jcStateTransition.create({
        data: {
          jobCardId: jc.id,
          fromState: jc.status,
          toState: 'CANCELLED',
          transitionType: 'BULK_CANCEL',
          actorId: (body.actorId as string) || 'system',
          reason,
        },
      })
    ),
  ]);

  return apiSuccess({
    cancelled: cancellableIds.length,
    skipped: skippedCount,
    total: jobCardIds.length,
  }, `Successfully cancelled ${cancellableIds.length} job card(s)${skippedCount > 0 ? `, skipped ${skippedCount} due to invalid status` : ''}`);
}
