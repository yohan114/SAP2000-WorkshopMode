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

// Schema for creating a service interval
const createServiceIntervalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  intervalValue: z.number().positive(),
  unit: z.enum(['KM', 'HOURS']),
  description: z.string().optional(),
});

// GET /api/service-intervals - List all active service intervals
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const paginated = url.searchParams.get('paginated');

    if (paginated === 'true') {
      const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
      const skip = getSkip(page, limit);

      const where: Record<string, unknown> = { isActive: true };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const orderBy: Record<string, unknown> = {};
      if (sortBy) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.name = 'asc';
      }

      const [intervals, total] = await Promise.all([
        db.serviceInterval.findMany({
          where,
          skip,
          take: limit,
          orderBy,
        }),
        db.serviceInterval.count({ where }),
      ]);

      return apiPaginated(intervals, total, page, limit);
    }

    // Simple list of all active intervals
    const intervals = await db.serviceInterval.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return apiSuccess(intervals);
  } catch (error) {
    console.error('Get service intervals error:', error);
    return apiError('Failed to fetch service intervals', 500);
  }
}

// POST /api/service-intervals - Create a new service interval
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createServiceIntervalSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    const interval = await db.serviceInterval.create({
      data: {
        name: data.name,
        intervalValue: data.intervalValue,
        unit: data.unit,
        description: data.description,
      },
    });

    return apiSuccess(interval, 'Service interval created successfully', 201);
  } catch (error) {
    console.error('Create service interval error:', error);
    return apiError('Failed to create service interval', 500);
  }
}
