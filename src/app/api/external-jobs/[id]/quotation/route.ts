import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound, 
  apiValidationError,
  generateDocumentNumber,
} from '@/lib/api-utils';
import { z } from 'zod';

// Quotation status enum
const QuotationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

// Schema for creating quotation
const createQuotationSchema = z.object({
  quotationNumber: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('LKR'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for updating quotation (approve/reject)
const updateQuotationSchema = z.object({
  quotationId: z.string().min(1, 'Quotation ID is required'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

// GET /api/external-jobs/[id]/quotation - Get quotations for this job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify external job exists
    const externalJob = await db.externalJob.findUnique({
      where: { id },
      select: { id: true, isActive: true, status: true },
    });

    if (!externalJob || !externalJob.isActive) {
      return apiNotFound('External job');
    }

    // Get all quotations for this job
    const quotations = await db.externalQuotation.findMany({
      where: { externalJobId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Add computed fields
    const data = quotations.map(q => ({
      ...q,
      isExpired: q.validUntil ? new Date(q.validUntil) < new Date() : false,
      daysUntilExpiry: q.validUntil 
        ? Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    // Summary statistics
    const summary = {
      total: quotations.length,
      byStatus: {
        pending: quotations.filter(q => q.status === 'PENDING').length,
        approved: quotations.filter(q => q.status === 'APPROVED').length,
        rejected: quotations.filter(q => q.status === 'REJECTED').length,
        expired: quotations.filter(q => q.status === 'EXPIRED').length,
      },
      approvedAmount: quotations
        .filter(q => q.status === 'APPROVED')
        .reduce((sum, q) => sum + Number(q.amount), 0),
      highestQuotation: quotations.length > 0 
        ? Math.max(...quotations.map(q => Number(q.amount)))
        : null,
      lowestQuotation: quotations.length > 0 
        ? Math.min(...quotations.map(q => Number(q.amount)))
        : null,
    };

    return apiSuccess({
      quotations: data,
      summary,
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    return apiError('Failed to fetch quotations', 500);
  }
}

// POST /api/external-jobs/[id]/quotation - Add quotation to job
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validationResult = createQuotationSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const data = validationResult.data;

    // Verify external job exists
    const externalJob = await db.externalJob.findUnique({
      where: { id },
    });

    if (!externalJob || !externalJob.isActive) {
      return apiNotFound('External job');
    }

    // Only allow adding quotations for DRAFT or QUOTATION_PENDING status
    if (!['DRAFT', 'QUOTATION_PENDING'].includes(externalJob.status)) {
      return apiError(
        'Cannot add quotation to job in current status',
        400
      );
    }

    // Generate quotation number if not provided
    const quotationNumber = data.quotationNumber || 
      generateDocumentNumber('Q', await db.externalQuotation.count() + 1);

    // Create quotation
    const quotation = await db.externalQuotation.create({
      data: {
        externalJobId: id,
        quotationNumber,
        amount: data.amount,
        currency: data.currency,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        status: QuotationStatus.PENDING,
        notes: data.notes,
      },
    });

    // Update job status to QUOTATION_PENDING if it was DRAFT
    if (externalJob.status === 'DRAFT') {
      await db.externalJob.update({
        where: { id },
        data: {
          status: 'QUOTATION_PENDING',
          updatedAt: new Date(),
        },
      });
    }

    return apiSuccess(quotation, 'Quotation added successfully', 201);
  } catch (error) {
    console.error('Create quotation error:', error);
    return apiError('Failed to create quotation', 500);
  }
}

// PUT /api/external-jobs/[id]/quotation - Approve/reject quotation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validationResult = updateQuotationSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const data = validationResult.data;

    // Verify external job exists
    const externalJob = await db.externalJob.findUnique({
      where: { id },
    });

    if (!externalJob || !externalJob.isActive) {
      return apiNotFound('External job');
    }

    // Verify quotation belongs to this job
    const quotation = await db.externalQuotation.findFirst({
      where: {
        id: data.quotationId,
        externalJobId: id,
      },
    });

    if (!quotation) {
      return apiNotFound('Quotation');
    }

    // Check if quotation is in PENDING status
    if (quotation.status !== 'PENDING') {
      return apiError(
        `Cannot ${data.action} quotation that is already ${quotation.status}`,
        400
      );
    }

    // Check if quotation is expired
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      return apiError('Cannot approve expired quotation', 400);
    }

    // Check if there's already an approved quotation
    if (data.action === 'approve') {
      const existingApproved = await db.externalQuotation.findFirst({
        where: {
          externalJobId: id,
          status: 'APPROVED',
        },
      });

      if (existingApproved) {
        return apiError(
          'There is already an approved quotation for this job. Reject it first.',
          400
        );
      }
    }

    // Use transaction for approval
    const result = await db.$transaction(async (tx) => {
      // Update quotation status
      const updatedQuotation = await tx.externalQuotation.update({
        where: { id: data.quotationId },
        data: {
          status: data.action === 'approve' ? 'APPROVED' : 'REJECTED',
          approvedAt: data.action === 'approve' ? new Date() : undefined,
          notes: data.notes || quotation.notes,
        },
      });

      // If approved, update job status and estimated cost
      if (data.action === 'approve') {
        await tx.externalJob.update({
          where: { id },
          data: {
            status: 'APPROVED',
            estimatedCost: Number(quotation.amount),
            updatedAt: new Date(),
          },
        });

        // Reject all other pending quotations
        await tx.externalQuotation.updateMany({
          where: {
            externalJobId: id,
            status: 'PENDING',
            id: { not: data.quotationId },
          },
          data: {
            status: 'REJECTED',
            notes: 'Automatically rejected due to another quotation being approved',
          },
        });
      }

      return updatedQuotation;
    });

    return apiSuccess(
      result,
      `Quotation ${data.action}d successfully`
    );
  } catch (error) {
    console.error('Update quotation error:', error);
    return apiError('Failed to update quotation', 500);
  }
}
