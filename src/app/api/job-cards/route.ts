import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
  generateDocumentNumber 
} from '@/lib/api-utils';
import { z } from 'zod';

// Job Card status enum matching schema
const JobCardStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

const JobType = {
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
  EMERGENCY: 'EMERGENCY',
  INSPECTION: 'INSPECTION',
  MODIFICATION: 'MODIFICATION',
} as const;

const Priority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  EMERGENCY: 'EMERGENCY',
} as const;

// Schema for creating job card
const createJobCardSchema = z.object({
  assetId: z.string().min(1),
  jobType: z.enum(Object.keys(JobType) as [string, ...string[]]),
  priority: z.enum(Object.keys(Priority) as [string, ...string[]]).default('NORMAL'),
  faultDescription: z.string().min(1),
  diagnosisNotes: z.string().optional(),
  estimatedCost: z.number().optional(),
  estimatedDuration: z.number().int().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  meterReadingStart: z.number().optional(),
  ecoNumber: z.string().optional(),
  accidentReportRef: z.string().optional(),
  warrantyClaimRef: z.string().optional(),
});

// GET /api/job-cards - List job cards with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const assetId = url.searchParams.get('assetId');
    const jobType = url.searchParams.get('jobType');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (jobType) {
      where.jobType = jobType;
    }
    
    if (search) {
      where.OR = [
        { jobCardNumber: { contains: search } },
        { faultDescription: { contains: search } },
        { ecoNumber: { contains: search } },
      ];
    }

    // Build orderBy - must be an array for Prisma
    let orderBy: Array<Record<string, string>>;
    if (sortBy) {
      orderBy = [{ [sortBy]: sortOrder }];
    } else {
      // Default: priority first, then created date
      orderBy = [{ priority: 'desc' }, { createdAt: 'desc' }];
    }

    const [jobCards, total] = await Promise.all([
      db.jobCard.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            select: {
              id: true,
              assetNumber: true,
              name: true,
              status: true,
            },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          supervisor: {
            select: { id: true, name: true },
          },
          technicianAssignments: {
            where: { isActive: true },
            include: {
              technician: {
                select: { id: true, name: true, employeeId: true },
              },
            },
          },
          _count: {
            select: { 
              tasks: true,
              materialRequests: true,
            },
          },
        },
      }),
      db.jobCard.count({ where }),
    ]);

    // Transform data
    const data = jobCards.map(jc => ({
      id: jc.id,
      jobCardNumber: jc.jobCardNumber,
      asset: jc.asset,
      jobType: jc.jobType,
      priority: jc.priority,
      status: jc.status,
      faultDescription: jc.faultDescription,
      estimatedCost: jc.estimatedCost,
      estimatedDuration: jc.estimatedDuration,
      scheduledStart: jc.scheduledStart,
      scheduledEnd: jc.scheduledEnd,
      actualStart: jc.actualStart,
      actualEnd: jc.actualEnd,
      creator: jc.creator,
      supervisor: jc.supervisor,
      technicians: jc.technicianAssignments.map(ta => ta.technician),
      taskCount: jc._count.tasks,
      materialRequestCount: jc._count.materialRequests,
      createdAt: jc.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get job cards error:', error);
    return apiError('Failed to fetch job cards', 500);
  }
}

// POST /api/job-cards - Create new job card
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createJobCardSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const data = result.data;

    // Verify asset exists
    const asset = await db.asset.findUnique({
      where: { id: data.assetId },
    });

    if (!asset || !asset.isActive) {
      return apiError('Asset not found', 404);
    }

    // Get sequence for job card number
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.jobCard.count({
      where: {
        createdAt: {
          gte: new Date(`${currentMonth}-01`),
        },
      },
    });

    const jobCardNumber = generateDocumentNumber('JC', count + 1);

    // Create job card
    const jobCard = await db.jobCard.create({
      data: {
        jobCardNumber,
        assetId: data.assetId,
        jobType: data.jobType,
        priority: data.priority,
        faultDescription: data.faultDescription,
        diagnosisNotes: data.diagnosisNotes,
        estimatedCost: data.estimatedCost,
        estimatedDuration: data.estimatedDuration,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
        meterReadingStart: data.meterReadingStart,
        ecoNumber: data.ecoNumber,
        accidentReportRef: data.accidentReportRef,
        warrantyClaimRef: data.warrantyClaimRef,
        status: JobCardStatus.DRAFT,
        actualCost: 0,
      },
      include: {
        asset: true,
      },
    });

    // Create initial state transition
    await db.jcStateTransition.create({
      data: {
        jobCardId: jobCard.id,
        fromState: 'NEW',
        toState: JobCardStatus.DRAFT,
        transitionType: 'CREATE',
        actorId: body.createdBy || 'system',
        reason: 'Job card created',
      },
    });

    return apiSuccess(jobCard, 'Job card created successfully', 201);
  } catch (error) {
    console.error('Create job card error:', error);
    return apiError('Failed to create job card', 500);
  }
}
