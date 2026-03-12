import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const createCategorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  parentCatId: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/asset-categories - List all asset categories
export async function GET() {
  try {
    const categories = await db.assetCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    const data = categories.map(cat => ({
      id: cat.id,
      code: cat.code,
      name: cat.name,
      description: cat.description,
      parentCatId: cat.parentCatId,
      assetCount: cat._count.assets,
    }));

    return apiSuccess(data);
  } catch (error) {
    console.error('Get asset categories error:', error);
    return apiError('Failed to fetch asset categories', 500);
  }
}

// POST /api/asset-categories - Create new category
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createCategorySchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    // Check if code already exists
    const existing = await db.assetCategory.findUnique({
      where: { code: result.data.code },
    });

    if (existing) {
      return apiError('Category code already exists', 400);
    }

    const category = await db.assetCategory.create({
      data: result.data,
    });

    return apiSuccess(category, 'Category created successfully', 201);
  } catch (error) {
    console.error('Create asset category error:', error);
    return apiError('Failed to create asset category', 500);
  }
}
