import { db } from '@/lib/db';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  apiValidationError,
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating a wrong item return record
const createWrongItemReturnSchema = z.object({
  grnId: z.string().min(1, 'GRN ID is required'),
  grnLineId: z.string().optional(),
  poId: z.string().optional(),
  itemId: z.string().min(1, 'Item ID is required'),
  identifiedAt: z.string().min(1, 'Identified date is required'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

// GET /api/wrong-item-returns - List wrong item returns with pagination/filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filter parameters
    const status = url.searchParams.get('status');
    const grnId = url.searchParams.get('grnId');
    const itemId = url.searchParams.get('itemId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    if (status) {
      where.status = status;
    }

    if (grnId) {
      where.grnId = grnId;
    }

    if (itemId) {
      where.itemId = itemId;
    }

    if (search) {
      where.OR = [
        { reason: { contains: search } },
        { notes: { contains: search } },
        { itemId: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const dbModel = (db as any).wrongItemReturn;

    const [returns, total] = await Promise.all([
      dbModel.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          grn: {
            select: {
              id: true,
              grnNumber: true,
            },
          },
        },
      }),
      dbModel.count({ where }),
    ]);

    return apiPaginated(returns, total, page, limit);
  } catch (error) {
    console.error('Get wrong item returns error:', error);
    return apiError('Failed to fetch wrong item returns', 500);
  }
}

// POST /api/wrong-item-returns - Create a new wrong item return record
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createWrongItemReturnSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Verify GRN exists
    const grn = await db.grnHeader.findUnique({
      where: { id: data.grnId },
    });

    if (!grn || !grn.isActive) {
      return apiError('GRN not found or inactive', 404);
    }

    const dbModel = (db as any).wrongItemReturn;

    // Create the wrong item return record
    const wrongItemReturn = await dbModel.create({
      data: {
        grnId: data.grnId,
        grnLineId: data.grnLineId,
        poId: data.poId,
        itemId: data.itemId,
        identifiedAt: new Date(data.identifiedAt),
        reason: data.reason,
        status: 'IDENTIFIED',
        notes: data.notes,
      },
      include: {
        grn: {
          select: {
            id: true,
            grnNumber: true,
          },
        },
      },
    });

    return apiSuccess(wrongItemReturn, 'Wrong item return record created successfully', 201);
  } catch (error) {
    console.error('Create wrong item return error:', error);
    return apiError('Failed to create wrong item return record', 500);
  }
}
