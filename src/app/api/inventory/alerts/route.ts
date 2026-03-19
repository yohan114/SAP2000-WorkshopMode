import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip } from '@/lib/api-utils';

// GET - Get low stock alerts
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url);
    const skip = getSkip(page, limit);

    const alertType = url.searchParams.get('type') || 'all'; // 'low', 'out', 'all'

    // Query stock items that are at or below reorder level
    const stockItems = await db.$queryRaw<Array<{
      storeStockId: string;
      storeId: string;
      storeCode: string;
      storeName: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      unitOfMeasure: string;
      itemClass: string;
      availableQty: number;
      reservedQty: number;
      quarantineQty: number;
      wac: number;
      reorderLevel: number | null;
      minimumStock: number | null;
    }>>`
      SELECT 
        ss.id as storeStockId,
        ss.storeId,
        s.code as storeCode,
        s.name as storeName,
        i.id as itemId,
        i.itemCode,
        i.name as itemName,
        i.unitOfMeasure,
        i.itemClass,
        ss.availableQty,
        ss.reservedQty,
        ss.quarantineQty,
        ss.wac,
        i.reorderLevel,
        i.minimumStock
      FROM StoreStock ss
      INNER JOIN Store s ON ss.storeId = s.id
      INNER JOIN Item i ON ss.itemId = i.id
      WHERE ss.availableQty <= COALESCE(i.reorderLevel, 0)
        AND i.isActive = 1
      ORDER BY 
        CASE 
          WHEN ss.availableQty = 0 THEN 0
          WHEN ss.availableQty <= COALESCE(i.minimumStock, 0) THEN 1
          ELSE 2
        END,
        ss.availableQty ASC
    `;

    // Filter by alert type
    let filteredItems = stockItems;
    if (alertType === 'out') {
      filteredItems = stockItems.filter(item => item.availableQty === 0);
    } else if (alertType === 'low') {
      filteredItems = stockItems.filter(item => item.availableQty > 0);
    }

    // Paginate
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    // Transform to alerts
    const alerts = paginatedItems.map(item => {
      const alertLevel = item.availableQty === 0 ? 'CRITICAL' : 
                         item.availableQty <= (item.minimumStock || 0) ? 'HIGH' : 'MEDIUM';
      const shortage = (item.reorderLevel || 0) - item.availableQty;
      
      return {
        id: item.storeStockId,
        store: {
          id: item.storeId,
          code: item.storeCode,
          name: item.storeName,
        },
        item: {
          id: item.itemId,
          itemCode: item.itemCode,
          name: item.itemName,
          unitOfMeasure: item.unitOfMeasure,
          itemClass: item.itemClass,
        },
        availableQty: item.availableQty,
        reservedQty: item.reservedQty,
        quarantineQty: item.quarantineQty,
        wac: item.wac,
        reorderLevel: item.reorderLevel,
        minimumStock: item.minimumStock,
        shortage: Math.max(0, shortage),
        alertLevel,
        suggestedOrderQty: Math.max(0, shortage),
        stockValue: item.availableQty * item.wac,
      };
    });

    return apiPaginated(alerts, total, page, limit);
  } catch (error) {
    console.error('Get alerts error:', error);
    return apiError('Failed to fetch low stock alerts', 500);
  }
}
