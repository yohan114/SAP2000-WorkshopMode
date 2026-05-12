import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// External Job status enum
const ExternalJobStatus = {
  DRAFT: 'DRAFT',
  QUOTATION_PENDING: 'QUOTATION_PENDING',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  INVOICED: 'INVOICED',
  CANCELLED: 'CANCELLED',
} as const;

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  DRAFT: ['QUOTATION_PENDING', 'CANCELLED'],
  QUOTATION_PENDING: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
};

// Schema for updating external job
const updateExternalJobSchema = z.object({
  subcontractorId: z.string().optional(),
  jobType: z.enum(['REPAIR', 'OVERHAUL', 'FABRICATION', 'INSPECTION', 'CALIBRATION', 'PAINTING', 'OTHER']).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'QUOTATION_PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED']).optional(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  completedAt: z.string().optional(),
  invoiceRef: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/external-jobs/[id] - Get single external job with all relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const externalJob = await db.externalJob.findUnique({
      where: { id },
      include: {
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
            faultDescription: true,
            status: true,
            priority: true,
            asset: {
              select: {
                id: true,
                assetNumber: true,
                name: true,
              },
            },
          },
        },
        costs: {
          orderBy: { costDate: 'desc' },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!externalJob || !externalJob.isActive) {
      return apiNotFound('External job');
    }

    // Get subcontractor info (stored in subcontractorId field but we need to fetch it)
    // Note: The schema doesn't have a direct relation to Subcontractor, but has subcontractorId
    let subcontractor: any = null;
    if (externalJob.subcontractorId) {
      subcontractor = await db.subcontractor.findUnique({
        where: { id: externalJob.subcontractorId },
        select: {
          id: true,
          code: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          specialization: true,
          rating: true,
        },
      });
    }

    // Calculate totals
    const totalCosts = externalJob.costs.reduce((sum, c) => sum + Number(c.amount), 0);
    const approvedQuotation = externalJob.quotations.find(q => q.status === 'APPROVED');
    const pendingQuotations = externalJob.quotations.filter(q => q.status === 'PENDING');

    // Group costs by type
    const costsByType = externalJob.costs.reduce((acc, cost) => {
      const type = cost.costType;
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0 };
      }
      acc[type].total += Number(cost.amount);
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return apiSuccess({
      ...externalJob,
      subcontractor,
      calculatedTotalCosts: totalCosts,
      approvedQuotation,
      pendingQuotations,
      costsByType,
      costSummary: {
        totalEntries: externalJob.costs.length,
        totalAmount: totalCosts,
        byType: costsByType,
      },
      quotationSummary: {
        total: externalJob.quotations.length,
        approved: externalJob.quotations.filter(q => q.status === 'APPROVED').length,
        pending: pendingQuotations.length,
        rejected: externalJob.quotations.filter(q => q.status === 'REJECTED').length,
      },
    });
  } catch (error) {
    console.error('Get external job error:', error);
    return apiError('Failed to fetch external job', 500);
  }
}

// PUT /api/external-jobs/[id] - Update external job (including status transitions)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateExternalJobSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if external job exists
    const existing = await db.externalJob.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('External job');
    }

    // Handle status transitions
    if (data.status && data.status !== existing.status) {
      const allowedNextStates = validTransitions[existing.status] || [];
      if (!allowedNextStates.includes(data.status)) {
        return apiError(
          `Invalid status transition from ${existing.status} to ${data.status}`,
          400
        );
      }
    }

    // Verify subcontractor if being changed
    if (data.subcontractorId && data.subcontractorId !== existing.subcontractorId) {
      const subcontractor = await db.subcontractor.findUnique({
        where: { id: data.subcontractorId },
      });
      if (!subcontractor) {
        return apiNotFound('Subcontractor');
      }
      if (subcontractor.status !== 'ACTIVE') {
        return apiError('Subcontractor is not active', 400);
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.subcontractorId !== undefined) updateData.subcontractorId = data.subcontractorId;
    if (data.jobType !== undefined) updateData.jobType = data.jobType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    if (data.actualCost !== undefined) updateData.actualCost = data.actualCost;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    if (data.invoiceRef !== undefined) updateData.invoiceRef = data.invoiceRef;
    if (data.warrantyExpiry !== undefined) updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Auto-set completedAt if status is COMPLETED and no completedAt provided
    if (data.status === 'COMPLETED' && !existing.completedAt && !data.completedAt) {
      updateData.completedAt = new Date();
    }

    // Update external job
    const externalJob = await db.externalJob.update({
      where: { id },
      data: updateData,
      include: {
        costs: true,
        quotations: true,
      },
    });

    return apiSuccess(externalJob, 'External job updated successfully');
  } catch (error) {
    console.error('Update external job error:', error);
    return apiError('Failed to update external job', 500);
  }
}

// DELETE /api/external-jobs/[id] - Soft delete (set isActive = false)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if external job exists
    const existing = await db.externalJob.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('External job');
    }

    // Only allow deletion for DRAFT or CANCELLED status
    if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
      return apiError(
        'Cannot delete external job in current status. Only DRAFT or CANCELLED jobs can be deleted.',
        400
      );
    }

    // Soft delete
    await db.externalJob.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return apiSuccess({ id }, 'External job deleted successfully');
  } catch (error) {
    console.error('Delete external job error:', error);
    return apiError('Failed to delete external job', 500);
  }
}
