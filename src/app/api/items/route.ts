import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating a new item
const createItemSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  itemClass: z.enum(['SPARE_PART', 'CONSUMABLE', 'LUBRICANT', 'TOOL']).default('CONSUMABLE'),
  minimumStock: z.number().min(0).optional(),
  maximumStock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  maxIssueLimit: z.number().min(0).optional(),
  isTool: z.boolean().default(false),
  isCritical: z.boolean().default(false),
});

// GET /api/items - List items for dropdowns
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const itemClass = url.searchParams.get('itemClass');
    const isTool = url.searchParams.get('isTool');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (itemClass) {
      where.itemClass = itemClass;
    }
    if (isTool !== null) {
      where.isTool = isTool === 'true';
    }
    
    if (search) {
      where.OR = [
        { itemCode: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          stock: {
            select: {
              availableQty: true,
              wac: true,
              storeId: true,
            },
          },
        },
      }),
      db.item.count({ where }),
    ]);

    // Transform data
    const data = items.map(item => {
      const totalStock = item.stock.reduce((acc, s) => acc + s.availableQty.toNumber(), 0);
      const avgWac = item.stock.length > 0 
        ? item.stock.reduce((acc, s) => acc + s.wac.toNumber(), 0) / item.stock.length 
        : 0;

      return {
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        description: item.description,
        unitOfMeasure: item.unitOfMeasure,
        itemClass: item.itemClass,
        isTool: item.isTool,
        isCritical: item.isCritical,
        minimumStock: item.minimumStock?.toNumber(),
        reorderLevel: item.reorderLevel?.toNumber(),
        availableStock: totalStock,
        wac: avgWac,
      };
    });

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get items error:', error);
    return apiError('Failed to fetch items', 500);
  }
}

// POST /api/items - Create a new item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createItemSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if item code already exists
    const existingItem = await db.item.findUnique({
      where: { itemCode: data.itemCode },
    });

    if (existingItem) {
      return apiError('Item with this code already exists', 400);
    }

    // Create the item
    const item = await db.item.create({
      data: {
        itemCode: data.itemCode,
        name: data.name,
        description: data.description,
        unitOfMeasure: data.unitOfMeasure,
        itemClass: data.itemClass,
        minimumStock: data.minimumStock ?? 0,
        maximumStock: data.maximumStock,
        reorderLevel: data.reorderLevel,
        reorderQuantity: data.reorderQuantity,
        maxIssueLimit: data.maxIssueLimit,
        isTool: data.isTool,
        isCritical: data.isCritical,
      },
    });

    return apiSuccess(item, 'Item created successfully');
  } catch (error) {
    console.error('Create item error:', error);
    return apiError('Failed to create item', 500);
  }
}
