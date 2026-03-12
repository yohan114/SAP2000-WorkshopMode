import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const createStoreSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  storeType: z.enum(['MAIN', 'SITE', 'CONSUMABLE', 'FUEL']).default('MAIN'),
  location: z.string().optional(),
  managerId: z.string().optional(),
});

// GET /api/inventory/stores - List all stores
export async function GET() {
  try {
    const stores = await db.store.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { 
            stock: true,
            materialIssues: true,
            grnHeaders: true,
          },
        },
      },
    });

    // Get stock summary for each store
    const data = await Promise.all(stores.map(async (store) => {
      const stockItems = await db.storeStock.findMany({
        where: { storeId: store.id, availableQty: { gt: 0 } },
        include: {
          item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
        },
      });

      const totalValue = stockItems.reduce(
        (sum, s) => sum + Number(s.availableQty) * Number(s.wac),
        0
      );

      return {
        id: store.id,
        code: store.code,
        name: store.name,
        storeType: store.storeType,
        location: store.location,
        stockItemCount: stockItems.length,
        totalStockValue: totalValue,
        materialIssueCount: store._count.materialIssues,
        grnCount: store._count.grnHeaders,
      };
    }));

    return apiSuccess(data);
  } catch (error) {
    console.error('Get stores error:', error);
    return apiError('Failed to fetch stores', 500);
  }
}

// POST /api/inventory/stores - Create store
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createStoreSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    // Check if store code exists
    const existing = await db.store.findUnique({
      where: { code: result.data.code },
    });

    if (existing) {
      return apiError('Store code already exists', 400);
    }

    const store = await db.store.create({
      data: result.data,
    });

    return apiSuccess(store, 'Store created successfully', 201);
  } catch (error) {
    console.error('Create store error:', error);
    return apiError('Failed to create store', 500);
  }
}
