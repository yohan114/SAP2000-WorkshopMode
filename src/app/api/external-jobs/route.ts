import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  apiNotFound,
  apiValidationError,
  parsePagination,
  getSkip,
  generateDocumentNumber,
} from '@/lib/api-utils';
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

// Job Types enum
const JobType = {
  REPAIR: 'REPAIR',
  OVERHAUL: 'OVERHAUL',
  FABRICATION: 'FABRICATION',
  INSPECTION: 'INSPECTION',
  CALIBRATION: 'CALIBRATION',
  PAINTING: 'PAINTING',
  OTHER: 'OTHER',
} as const;

// Schema for creating external job
const createExternalJobSchema = z.object({
  jobCardId: z.string().optional(),
  assetId: z.string().optional(),
  subcontractorId: z.string().min(1, 'Subcontractor is required'),
  jobType: z.enum(['REPAIR', 'OVERHAUL', 'FABRICATION', 'INSPECTION', 'CALIBRATION', 'PAINTING', 'OTHER']),
  description: z.string().min(1, 'Description is required'),
  estimatedCost: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/external-jobs - List external jobs with filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filter parameters
    const status = url.searchParams.get('status');
    const subcontractorId = url.searchParams.get('subcontractorId');
    const jobCardId = url.searchParams.get('jobCardId');
    const jobType = url.searchParams.get('jobType');
    const assetId = url.searchParams.get('assetId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status) {
      where.status = status;
    }
    
    if (subcontractorId) {
      where.subcontractorId = subcontractorId;
    }
    
    if (jobCardId) {
      where.jobCardId = jobCardId;
    }
    
    if (jobType) {
      where.jobType = jobType;
    }
    
    if (assetId) {
      where.assetId = assetId;
    }
    
    if (search) {
      where.OR = [
        { jobNumber: { contains: search } },
        { description: { contains: search } },
        { invoiceRef: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [jobs, total] = await Promise.all([
      db.externalJob.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          jobCard: {
            select: {
              id: true,
              jobCardNumber: true,
              faultDescription: true,
              status: true,
            },
          },
          costs: {
            select: {
              id: true,
              costType: true,
              amount: true,
            },
          },
          quotations: {
            select: {
              id: true,
              quotationNumber: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
      db.externalJob.count({ where }),
    ]);

    // Transform data with computed fields
    const data = jobs.map(job => {
      const totalCosts = job.costs.reduce((sum, c) => sum + Number(c.amount), 0);
      const latestQuotation = job.quotations
        .sort((a, b) => new Date(b.createdAt as unknown as string).getTime() - new Date(a.createdAt as unknown as string).getTime())[0];
      
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        jobCard: job.jobCard,
        assetId: job.assetId,
        subcontractorId: job.subcontractorId,
        jobType: job.jobType,
        description: job.description,
        status: job.status,
        estimatedCost: job.estimatedCost,
        actualCost: job.actualCost,
        totalCosts,
        startDate: job.startDate,
        endDate: job.endDate,
        completedAt: job.completedAt,
        invoiceRef: job.invoiceRef,
        warrantyExpiry: job.warrantyExpiry,
        notes: job.notes,
        quotation: latestQuotation,
        quotationCount: job.quotations.length,
        costCount: job.costs.length,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    });

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get external jobs error:', error);
    return apiError('Failed to fetch external jobs', 500);
  }
}

// POST /api/external-jobs - Create external job with auto-generated job number
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createExternalJobSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Verify subcontractor exists and is active
    const subcontractor = await db.subcontractor.findUnique({
      where: { id: data.subcontractorId },
    });

    if (!subcontractor) {
      return apiNotFound('Subcontractor');
    }

    if (subcontractor.status !== 'ACTIVE') {
      return apiError('Subcontractor is not active', 400);
    }

    // Verify job card exists if provided
    if (data.jobCardId) {
      const jobCard = await db.jobCard.findUnique({
        where: { id: data.jobCardId },
      });

      if (!jobCard || !jobCard.isActive) {
        return apiNotFound('Job card');
      }
    }

    // Verify asset exists if provided
    if (data.assetId) {
      const asset = await db.asset.findUnique({
        where: { id: data.assetId },
      });

      if (!asset || !asset.isActive) {
        return apiNotFound('Asset');
      }
    }

    // Generate job number (EJ-YYMM-XXXX)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.externalJob.count({
      where: {
        createdAt: {
          gte: new Date(`${currentMonth}-01`),
        },
      },
    });

    const jobNumber = generateDocumentNumber('EJ', count + 1);

    // Create external job
    const externalJob = await db.externalJob.create({
      data: {
        jobNumber,
        jobCardId: data.jobCardId,
        assetId: data.assetId,
        subcontractorId: data.subcontractorId,
        jobType: data.jobType,
        description: data.description,
        status: ExternalJobStatus.DRAFT,
        estimatedCost: data.estimatedCost,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
      },
      include: {
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
          },
        },
      },
    });

    return apiSuccess(externalJob, 'External job created successfully', 201);
  } catch (error) {
    console.error('Create external job error:', error);
    return apiError('Failed to create external job', 500);
  }
}
