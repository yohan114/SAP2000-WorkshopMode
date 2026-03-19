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

/**
 * @openapi
 * /api/material-requests:
 *   get:
 *     tags:
 *       - Material Requests
 *     summary: List all material requests
 *     description: Retrieve a paginated list of material requests with optional filtering by status and job card.
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
 *         description: Search term for MR number or job card number
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/MRStatus'
 *         description: Filter by material request status
 *       - in: query
 *         name: jobCardId
 *         schema:
 *           type: string
 *         description: Filter by job card ID
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
 *         description: List of material requests with pagination
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
 *                         allOf:
 *                           - $ref: '#/components/schemas/MaterialRequest'
 *                           - type: object
 *                             properties:
 *                               jobCard:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   jobCardNumber:
 *                                     type: string
 *                                   asset:
 *                                     type: object
 *                                     properties:
 *                                       name:
 *                                         type: string
 *                               requestor:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                               lines:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     lineNumber:
 *                                       type: integer
 *                                     item:
 *                                       type: object
 *                                     requestedQty:
 *                                       type: number
 *                                     approvedQty:
 *                                       type: number
 *                                     issuedQty:
 *                                       type: number
 *                                     status:
 *                                       type: string
 *                               lineCount:
 *                                 type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Material Requests
 *     summary: Create a new material request
 *     description: Create a new material request with one or more line items. MR number is auto-generated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMRInput'
 *     responses:
 *       201:
 *         description: Material request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialRequest'
 *       400:
 *         description: Validation error or items not found
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

const MRStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PARTIALLY_ISSUED: 'PARTIALLY_ISSUED',
  FULLY_ISSUED: 'FULLY_ISSUED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
} as const;

const mrLineSchema = z.object({
  itemId: z.string().min(1),
  requestedQty: z.number().positive(),
  notes: z.string().optional(),
});

const createMRSchema = z.object({
  jobCardId: z.string().optional(),
  requestType: z.enum(['JC_LINKED', 'STOCK_REQUEST', 'EMERGENCY']).default('JC_LINKED'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'EMERGENCY']).default('NORMAL'),
  requiredBy: z.string().optional(),
  requestorId: z.string().min(1),
  lines: z.array(mrLineSchema).min(1),
  notes: z.string().optional(),
});

// GET /api/material-requests - List material requests
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const jobCardId = url.searchParams.get('jobCardId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status) {
      where.status = status;
    }
    if (jobCardId) {
      where.jobCardId = jobCardId;
    }
    
    if (search) {
      where.OR = [
        { mrNumber: { contains: search } },
        { jobCard: { jobCardNumber: { contains: search } } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [materialRequests, total] = await Promise.all([
      db.materialRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          jobCard: {
            select: {
              id: true,
              jobCardNumber: true,
              asset: { select: { name: true } },
            },
          },
          requestor: {
            select: { id: true, name: true },
          },
          lines: {
            include: {
              item: {
                select: {
                  id: true,
                  itemCode: true,
                  name: true,
                  unitOfMeasure: true,
                },
              },
            },
          },
          _count: {
            select: { lines: true },
          },
        },
      }),
      db.materialRequest.count({ where }),
    ]);

    // Transform data - ensure lines are properly formatted
    const data = materialRequests.map(mr => ({
      id: mr.id,
      mrNumber: mr.mrNumber,
      jobCardId: mr.jobCardId,
      jobCard: mr.jobCard,
      requestorId: mr.requestorId,
      requestor: mr.requestor,
      requestType: mr.requestType,
      priority: mr.priority,
      status: mr.status,
      requiredBy: mr.requiredBy,
      approvedAt: mr.approvedAt,
      approvedBy: mr.approvedBy,
      rejectionReason: mr.rejectionReason,
      createdAt: mr.createdAt,
      lines: mr.lines?.map(line => ({
        id: line.id,
        lineNumber: line.lineNumber,
        item: line.item,
        requestedQty: line.requestedQty,
        approvedQty: line.approvedQty,
        issuedQty: line.issuedQty,
        status: line.status,
        notes: line.notes,
      })) || [],
      lineCount: mr._count.lines,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get material requests error:', error);
    return apiError('Failed to fetch material requests', 500);
  }
}

// POST /api/material-requests - Create new material request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createMRSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { jobCardId, requestType, priority, requiredBy, requestorId, lines, notes } = result.data;

    // Verify items exist
    const itemIds = lines.map(l => l.itemId);
    const items = await db.item.findMany({
      where: { id: { in: itemIds } },
    });

    if (items.length !== itemIds.length) {
      return apiError('One or more items not found', 400);
    }

    // Generate MR number
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.materialRequest.count({
      where: { createdAt: { gte: new Date(`${currentMonth}-01`) } },
    });
    const mrNumber = generateDocumentNumber('MR', count + 1);

    // Create MR with lines
    const mr = await db.materialRequest.create({
      data: {
        mrNumber,
        jobCardId,
        requestorId,
        requestType,
        priority,
        requiredBy: requiredBy ? new Date(requiredBy) : undefined,
        status: MRStatus.DRAFT,
        createdBy: requestorId,
        lines: {
          create: lines.map((line, index) => ({
            lineNumber: index + 1,
            itemId: line.itemId,
            requestedQty: line.requestedQty,
            notes: line.notes,
            status: 'PENDING',
          })),
        },
      },
      include: {
        lines: {
          include: { item: true },
        },
      },
    });

    // Create state transition
    await db.mrStateTransition.create({
      data: {
        mrId: mr.id,
        fromState: 'NEW',
        toState: MRStatus.DRAFT,
        transitionType: 'CREATE',
        actorId: requestorId,
        reason: 'Material request created',
      },
    });

    return apiSuccess(mr, 'Material request created successfully', 201);
  } catch (error) {
    console.error('Create material request error:', error);
    return apiError('Failed to create material request', 500);
  }
}
