import { db } from '@/lib/db';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for creating PR
const createPrSchema = z.object({
  department: z.string().optional(),
  requestType: z.string().default('STANDARD'),
  priority: z.string().default('NORMAL'),
  procurementChannel: z.string().optional(),
  estimatedValue: z.number().optional(),
  requiredBy: z.string().optional(),
  justification: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unitOfMeasure: z.string().optional(),
    estimatedCost: z.number().optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one line is required'),
  requestorId: z.string().min(1, 'Requestor is required'),
});

// Generate PR number
async function generatePrNumber(): Promise<string> {
  const count = await db.purchaseRequest.count();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const sequence = String(count + 1).padStart(4, '0');
  return `PR-${year}${month}-${sequence}`;
}

// GET /api/pr - List PRs with pagination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = { isActive: true };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.prNumber = { contains: search };
    }

    const [prs, total] = await Promise.all([
      db.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prNumber: true,
          department: true,
          requestType: true,
          priority: true,
          status: true,
          procurementChannel: true,
          estimatedValue: true,
          requiredBy: true,
          createdAt: true,
          requestor: {
            select: {
              id: true,
              name: true,
              department: true,
            },
          },
          _count: {
            select: {
              lines: true,
            },
          },
        },
      }),
      db.purchaseRequest.count({ where }),
    ]);

    return apiPaginated(prs, total, page, limit);
  } catch (error) {
    console.error('Get PRs error:', error);
    return apiError('Failed to fetch purchase requests', 500);
  }
}

// POST /api/pr - Create a new PR
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = createPrSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }

    const data = result.data;

    // Generate PR number
    const prNumber = await generatePrNumber();

    // Calculate total estimated value
    const estimatedValue = data.estimatedValue || data.lines.reduce((sum, line) => sum + ((line.estimatedCost || 0) * line.quantity), 0);

    // Create PR with lines
    const pr = await db.purchaseRequest.create({
      data: {
        prNumber,
        requestorId: data.requestorId,
        department: data.department || null,
        requestType: data.requestType || 'STANDARD',
        priority: data.priority || 'NORMAL',
        procurementChannel: data.procurementChannel || null,
        estimatedValue,
        requiredBy: data.requiredBy ? new Date(data.requiredBy) : null,
        justification: null,
        status: 'DRAFT',
        lines: {
          create: data.lines.map((line, index) => ({
            lineNumber: index + 1,
            itemId: line.itemId || null,
            description: line.description,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure || null,
            estimatedCost: line.estimatedCost || null,
            totalEstCost: line.estimatedCost ? line.estimatedCost * line.quantity : null,
            status: 'PENDING',
            notes: line.notes || null,
          })),
        },
      },
      select: {
        id: true,
        prNumber: true,
        department: true,
        requestType: true,
        priority: true,
        status: true,
        estimatedValue: true,
        requiredBy: true,
        createdAt: true,
        requestor: {
          select: {
            id: true,
            name: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            description: true,
            quantity: true,
            unitOfMeasure: true,
            estimatedCost: true,
            totalEstCost: true,
            status: true,
          },
        },
      },
    });

    return apiSuccess(pr, 'Purchase request created successfully');
  } catch (error) {
    console.error('Create PR error:', error);
    return apiError('Failed to create purchase request', 500);
  }
}
