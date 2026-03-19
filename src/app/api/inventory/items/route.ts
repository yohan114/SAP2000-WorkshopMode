import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip 
} from '@/lib/api-utils';
import { z } from 'zod';

const createItemSchema = z.object({
  itemCode: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().min(1),
  itemClass: z.enum(['CONSUMABLE', 'SPARE_PART', 'LUBRICANT', 'TOOL', 'SAFETY']).default('CONSUMABLE'),
  minimumStock: z.number().min(0).default(0),
  maximumStock: z.number().optional(),
  reorderLevel: z.number().optional(),
  reorderQuantity: z.number().optional(),
  maxIssueLimit: z.number().optional(),
  isTool: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  forceHoChannel: z.boolean().default(false),
  highValueThreshold: z.number().optional(),
});

// GET /api/inventory/items - List items with pagination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filters
    const itemClass = url.searchParams.get('itemClass');
    const categoryId = url.searchParams.get('categoryId');
    const isCritical = url.searchParams.get('isCritical');
    const lowStock = url.searchParams.get('lowStock');

    const where: Record<string, unknown> = { isActive: true };

    if (itemClass) where.itemClass = itemClass;
    if (categoryId) where.categoryId = categoryId;
    if (isCritical === 'true') where.isCritical = true;

    if (search) {
      where.OR = [
        { itemCode: { contains: search } },
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

    const [items, total] = await Promise.all([
      db.item.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          stock: {
            include: {
              store: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
      db.item.count({ where }),
    ]);

    // Transform and add calculated fields
    const data = items.map(item => {
      const totalStock = item.stock.reduce((sum, s) => sum + Number(s.availableQty), 0);
      const totalReserved = item.stock.reduce((sum, s) => sum + Number(s.reservedQty), 0);
      const avgWac = item.stock.length > 0
        ? item.stock.reduce((sum, s) => sum + Number(s.wac), 0) / item.stock.length
        : 0;

      return {
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        description: item.description,
        unitOfMeasure: item.unitOfMeasure,
        itemClass: item.itemClass,
        minimumStock: item.minimumStock,
        reorderLevel: item.reorderLevel,
        isTool: item.isTool,
        isCritical: item.isCritical,
        totalStock,
        totalReserved,
        avgWac,
        isLowStock: totalStock <= Number(item.minimumStock),
        stockByStore: item.stock.map(s => ({
          store: s.store,
          availableQty: Number(s.availableQty),
          reservedQty: Number(s.reservedQty),
          wac: Number(s.wac),
        })),
      };
    });

    // Filter by low stock if requested
    const filteredData = lowStock === 'true' 
      ? data.filter(item => item.isLowStock)
      : data;

    return apiPaginated(filteredData, lowStock === 'true' ? filteredData.length : total, page, limit);
  } catch (error) {
    console.error('Get items error:', error);
    return apiError('Failed to fetch items', 500);
  }
}

// POST /api/inventory/items - Create item
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createItemSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    // Check if item code exists
    const existing = await db.item.findUnique({
      where: { itemCode: result.data.itemCode },
    });

    if (existing) {
      return apiError('Item code already exists', 400);
    }

    const item = await db.item.create({
      data: result.data,
    });

    return apiSuccess(item, 'Item created successfully', 201);
  } catch (error) {
    console.error('Create item error:', error);
    return apiError('Failed to create item', 500);
  }
}
