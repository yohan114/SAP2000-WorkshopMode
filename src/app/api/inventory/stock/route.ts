import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip 
} from '@/lib/api-utils';
import { z } from 'zod';

const adjustStockSchema = z.object({
  storeId: z.string().min(1),
  itemId: z.string().min(1),
  adjustmentType: z.enum(['RECEIVE', 'ISSUE', 'ADJUST_UP', 'ADJUST_DOWN', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN']),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().min(1),
});

// GET /api/inventory/stock - Get stock levels
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    const storeId = url.searchParams.get('storeId');
    const lowStock = url.searchParams.get('lowStock');

    const where: Record<string, unknown> = { availableQty: { gt: 0 } };
    if (storeId) where.storeId = storeId;

    const [stock, total] = await Promise.all([
      db.storeStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMovementAt: 'desc' },
        include: {
          store: { select: { id: true, code: true, name: true } },
          item: {
            select: {
              id: true,
              itemCode: true,
              name: true,
              unitOfMeasure: true,
              itemClass: true,
              minimumStock: true,
              reorderLevel: true,
              isCritical: true,
            },
          },
        },
      }),
      db.storeStock.count({ where }),
    ]);

    let data = stock.map(s => ({
      id: s.id,
      store: s.store,
      item: s.item,
      availableQty: Number(s.availableQty),
      reservedQty: Number(s.reservedQty),
      quarantineQty: Number(s.quarantineQty),
      wac: Number(s.wac),
      totalValue: Number(s.availableQty) * Number(s.wac),
      lastMovementAt: s.lastMovementAt,
      isLowStock: Number(s.availableQty) <= Number(s.item.minimumStock),
    }));

    // Filter by low stock if requested
    if (lowStock === 'true') {
      data = data.filter(s => s.isLowStock);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      data = data.filter(s =>
        s.item.itemCode.toLowerCase().includes(searchLower) ||
        s.item.name.toLowerCase().includes(searchLower)
      );
    }

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get stock error:', error);
    return apiError('Failed to fetch stock', 500);
  }
}

// POST /api/inventory/stock - Adjust stock (receive, issue, adjust)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = adjustStockSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const { 
      storeId, 
      itemId, 
      adjustmentType, 
      quantity, 
      unitCost, 
      referenceType, 
      referenceId, 
      notes, 
      performedBy 
    } = result.data;

    // Verify store and item exist
    const [store, item] = await Promise.all([
      db.store.findUnique({ where: { id: storeId } }),
      db.item.findUnique({ where: { id: itemId } }),
    ]);

    if (!store || !store.isActive) {
      return apiError('Store not found', 404);
    }
    if (!item || !item.isActive) {
      return apiError('Item not found', 404);
    }

    // Get current stock
    let stock = await db.storeStock.findUnique({
      where: { storeId_itemId: { storeId, itemId } },
    });

    if (!stock) {
      // Create stock record if doesn't exist
      stock = await db.storeStock.create({
        data: { storeId, itemId, availableQty: 0, reservedQty: 0, quarantineQty: 0, wac: 0 },
      });
    }

    const currentQty = Number(stock.availableQty);
    const currentWac = Number(stock.wac);
    let newQty = currentQty;
    let newWac = currentWac;
    let transactionQty = quantity;
    let transactionType = adjustmentType;

    // Calculate new quantity and WAC
    switch (adjustmentType) {
      case 'RECEIVE':
      case 'TRANSFER_IN':
      case 'RETURN':
        newQty = currentQty + quantity;
        // Update WAC if unit cost provided
        if (unitCost && unitCost > 0) {
          newWac = ((currentQty * currentWac) + (quantity * unitCost)) / newQty;
        }
        break;

      case 'ISSUE':
      case 'TRANSFER_OUT':
        if (currentQty < quantity) {
          return apiError('Insufficient stock', 400, `Available: ${currentQty}, Requested: ${quantity}`);
        }
        newQty = currentQty - quantity;
        transactionQty = -quantity;
        break;

      case 'ADJUST_UP':
        newQty = currentQty + quantity;
        break;

      case 'ADJUST_DOWN':
        if (currentQty < quantity) {
          return apiError('Insufficient stock for adjustment', 400);
        }
        newQty = currentQty - quantity;
        transactionQty = -quantity;
        break;
    }

    const effectiveUnitCost = unitCost || currentWac;

    // Use transaction to update stock and create transaction record
    const [updatedStock, transaction] = await db.$transaction([
      db.storeStock.update({
        where: { id: stock.id },
        data: {
          availableQty: newQty,
          wac: newWac,
          lastMovementAt: new Date(),
        },
      }),
      db.stockTransaction.create({
        data: {
          storeId,
          itemId,
          transactionType,
          quantity: Math.abs(transactionQty),
          unitCost: effectiveUnitCost,
          totalValue: Math.abs(transactionQty) * effectiveUnitCost,
          referenceType,
          referenceId,
          performedBy,
          notes,
        },
      }),
    ]);

    return apiSuccess({
      stock: {
        ...updatedStock,
        availableQty: Number(updatedStock.availableQty),
        wac: Number(updatedStock.wac),
      },
      transaction,
    }, 'Stock adjusted successfully', 201);
  } catch (error) {
    console.error('Adjust stock error:', error);
    return apiError('Failed to adjust stock', 500);
  }
}
