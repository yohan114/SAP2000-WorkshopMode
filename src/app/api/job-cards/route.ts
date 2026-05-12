import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
  generateDocumentNumber 
} from '@/lib/api-utils';
import { triggerWebhooks } from '@/lib/webhook-service';
import { JobCardStatus, JobCardPriority } from '@/lib/job-card-state-machine';
import { z } from 'zod';

/**
 * @openapi
 * /api/job-cards:
 *   get:
 *     tags:
 *       - Job Cards
 *     summary: List all job cards
 *     description: Retrieve a paginated list of job cards with optional filtering by status, priority, asset, and job type.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for job card number, fault description, or ECO number
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/JobCardStatus'
 *         description: Filter by job card status
 *       - in: query
 *         name: priority
 *         schema:
 *           $ref: '#/components/schemas/Priority'
 *         description: Filter by priority
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by asset ID
 *       - in: query
 *         name: jobType
 *         schema:
 *           $ref: '#/components/schemas/JobType'
 *         description: Filter by job type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of job cards with pagination
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/JobCard'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Job Cards
 *     summary: Create a new job card
 *     description: Create a new job card for an asset with fault description and other details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobCardInput'
 *     responses:
 *       201:
 *         description: Job card created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobCard'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Job Card status values from state machine
const JOB_CARD_STATUSES = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
] as const;

const JobType = {
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
  EMERGENCY: 'EMERGENCY',
  INSPECTION: 'INSPECTION',
  MODIFICATION: 'MODIFICATION',
} as const;

const PRIORITY_LEVELS = [
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL',
  'EMERGENCY',
] as const;

// Schema for creating job card
const createJobCardSchema = z.object({
  assetId: z.string().min(1),
  jobType: z.enum(Object.keys(JobType) as [string, ...string[]]),
  priority: z.enum(PRIORITY_LEVELS).default('NORMAL'),
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
    let orderBy: Array<Record<string, unknown>>;
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
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
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
        status: 'DRAFT' as JobCardStatus,
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
        toState: 'DRAFT',
        transitionType: 'CREATE',
        actorId: body.createdBy || 'system',
        reason: 'Job card created',
      },
    });

    // Trigger webhook for job card creation
    await triggerWebhooks('JOB_CARD_CREATED', {
      id: jobCard.id,
      jobCardNumber: jobCard.jobCardNumber,
      assetId: jobCard.assetId,
      assetNumber: jobCard.asset.assetNumber,
      assetName: jobCard.asset.name,
      jobType: jobCard.jobType,
      priority: jobCard.priority,
      status: jobCard.status,
      faultDescription: jobCard.faultDescription,
      estimatedCost: jobCard.estimatedCost?.toNumber(),
      createdAt: jobCard.createdAt,
    });

    return apiSuccess(jobCard, 'Job card created successfully', 201);
  } catch (error) {
    console.error('Create job card error:', error);
    return apiError('Failed to create job card', 500);
  }
}
