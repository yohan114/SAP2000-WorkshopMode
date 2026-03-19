import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
  handleApiError,
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating a new photo category
const createPhotoCategorySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sequence: z.number().int().min(1).default(1),
  minPhotos: z.number().int().min(0).default(0),
  maxPhotos: z.number().int().min(1).default(10),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categoryType: z.string().default('JOB_CARD'), // JOB_CARD, TASK, MATERIAL_REQUEST, GRN, etc.
});

// GET /api/photo-categories - List all photo categories
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);

    // Additional filters
    const isActiveParam = url.searchParams.get('isActive');
    const isRequired = url.searchParams.get('isRequired');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true';
    }
    if (isRequired !== null) {
      where.isRequired = isRequired === 'true';
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [categories, total] = await Promise.all([
      db.jcPhotoCategory.findMany({
        where,
        skip: getSkip(page, limit),
        take: limit,
        orderBy: [
          { sequence: 'asc' },
          { name: 'asc' },
        ],
      }),
      db.jcPhotoCategory.count({ where }),
    ]);

    // Get photo counts separately
    const categoryIds = categories.map(c => c.id);
    const photoCounts = await db.jcPhoto.groupBy({
      by: ['categoryId'],
      where: { 
        categoryId: { in: categoryIds },
        isActive: true 
      },
      _count: { id: true }
    });

    const countMap = new Map(photoCounts.map(p => [p.categoryId, p._count.id]));

    // Transform data for response
    const data = categories.map(category => ({
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      sequence: category.sequence,
      minPhotos: category.minPhotos,
      maxPhotos: category.maxPhotos,
      isRequired: category.isRequired,
      isActive: category.isActive,
      categoryType: category.categoryType,
      photoCount: countMap.get(category.id) || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/photo-categories - Create a new photo category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createPhotoCategorySchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if code already exists
    const existingCategory = await db.jcPhotoCategory.findUnique({
      where: { code: data.code },
    });

    if (existingCategory) {
      return apiError('Photo category with this code already exists', 400);
    }

    // Validate minPhotos <= maxPhotos
    if (data.minPhotos > data.maxPhotos) {
      return apiError('minPhotos cannot be greater than maxPhotos', 400);
    }

    // Create the photo category
    const category = await db.jcPhotoCategory.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        sequence: data.sequence,
        minPhotos: data.minPhotos,
        maxPhotos: data.maxPhotos,
        isRequired: data.isRequired,
        isActive: data.isActive,
        categoryType: data.categoryType,
      },
    });

    const response = {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      sequence: category.sequence,
      minPhotos: category.minPhotos,
      maxPhotos: category.maxPhotos,
      isRequired: category.isRequired,
      isActive: category.isActive,
      categoryType: category.categoryType,
      photoCount: 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    return apiSuccess(response, 'Photo category created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
