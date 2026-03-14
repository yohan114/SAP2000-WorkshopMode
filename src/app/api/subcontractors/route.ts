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

// Subcontractor status enum
const SubcontractorStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLACKLISTED: 'BLACKLISTED',
} as const;

// Schema for creating subcontractor
const createSubcontractorSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(200),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().optional(),
  specialization: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).default('ACTIVE'),
  rating: z.number().min(0).max(5).optional(),
  notes: z.string().optional(),
});

// GET /api/subcontractors - List subcontractors with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const specialization = url.searchParams.get('specialization');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (specialization) {
      where.specialization = { contains: specialization };
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { contactPerson: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, string> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.name = 'asc';
    }

    const [subcontractors, total] = await Promise.all([
      db.subcontractor.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          code: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          specialization: true,
          status: true,
          rating: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.subcontractor.count({ where }),
    ]);

    return apiPaginated(subcontractors, total, page, limit);
  } catch (error) {
    console.error('Get subcontractors error:', error);
    return apiError('Failed to fetch subcontractors', 500);
  }
}

// POST /api/subcontractors - Create new subcontractor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createSubcontractorSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if code already exists
    const existingCode = await db.subcontractor.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      return apiError('Subcontractor code already exists', 400);
    }

    // Create subcontractor
    const subcontractor = await db.subcontractor.create({
      data: {
        code: data.code,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        specialization: data.specialization,
        status: data.status,
        rating: data.rating,
        notes: data.notes,
      },
    });

    return apiSuccess(subcontractor, 'Subcontractor created successfully', 201);
  } catch (error) {
    console.error('Create subcontractor error:', error);
    return apiError('Failed to create subcontractor', 500);
  }
}
