import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';

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
