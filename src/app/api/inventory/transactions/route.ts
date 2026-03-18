import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip } from '@/lib/api-utils';
import { z } from 'zod';

const createTransactionSchema = z.object({
  storeId: z.string().min(1),
  itemId: z.string().min(1),
  transactionType: z.enum(['RECEIPT', 'ISSUE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN']),
  quantity: z.number().positive(),
  unitCost: z.number().positive().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    const storeId = url.searchParams.get('storeId');
    const itemId = url.searchParams.get('itemId');
    const transactionType = url.searchParams.get('transactionType');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (itemId) where.itemId = itemId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt = { ...where.createdAt as object, gte: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt as object, lte: new Date(endDate) };
    }

    const orderBy: Record<string, string> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [transactions, total] = await Promise.all([
      db.stockTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          store: { select: { code: true, name: true } },
          item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
          user: { select: { name: true } },
        },
      }),
      db.stockTransaction.count({ where }),
    ]);

    return apiPaginated(
      transactions.map(t => ({
        id: t.id,
        store: t.store,
        item: t.item,
        transactionType: t.transactionType,
        quantity: t.quantity.toNumber(),
        unitCost: t.unitCost.toNumber(),
        totalValue: t.totalValue.toNumber(),
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        performedBy: t.user?.name,
        notes: t.notes,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit
    );
  } catch (error) {
    console.error('Get transactions error:', error);
    return apiError('Failed to fetch transactions', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createTransactionSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { storeId, itemId, transactionType, quantity, unitCost, referenceType, referenceId, notes, performedBy } = result.data;

    let stock = await db.storeStock.findUnique({
      where: { storeId_itemId: { storeId, itemId } },
    });

    if (!stock && ['RECEIPT', 'ADJUSTMENT_IN', 'TRANSFER_IN'].includes(transactionType)) {
      stock = await db.storeStock.create({
        data: {
          storeId,
          itemId,
          availableQty: 0,
          reservedQty: 0,
          quarantineQty: 0,
          wac: unitCost || 0,
        },
      });
    }

    if (!stock) {
      return apiError('Stock record not found', 404);
    }

    const currentQty = stock.availableQty.toNumber();
    const currentWac = stock.wac.toNumber();

    let newQty = currentQty;
    let newWac = currentWac;
    let effectiveCost = unitCost || currentWac;

    switch (transactionType) {
      case 'RECEIPT':
      case 'ADJUSTMENT_IN':
      case 'TRANSFER_IN':
      case 'RETURN':
        newQty = currentQty + quantity;
        if (unitCost && unitCost > 0 && transactionType === 'RECEIPT') {
          newWac = ((currentQty * currentWac) + (quantity * unitCost)) / newQty;
          effectiveCost = unitCost;
        }
        break;
      case 'ISSUE':
      case 'ADJUSTMENT_OUT':
      case 'TRANSFER_OUT':
        if (currentQty < quantity) {
          return apiError(`Insufficient stock. Available: ${currentQty}`, 400);
        }
        newQty = currentQty - quantity;
        effectiveCost = currentWac;
        break;
    }

    const totalValue = quantity * effectiveCost;

    const [transaction] = await db.$transaction([
      db.stockTransaction.create({
        data: {
          storeId,
          itemId,
          transactionType,
          quantity,
          unitCost: effectiveCost,
          totalValue,
          referenceType,
          referenceId,
          performedBy,
          notes,
        },
        include: {
          store: { select: { code: true, name: true } },
          item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
        },
      }),
      db.storeStock.update({
        where: { storeId_itemId: { storeId, itemId } },
        data: {
          availableQty: newQty,
          wac: newWac,
          lastMovementAt: new Date(),
        },
      }),
    ]);

    return apiSuccess({
      id: transaction.id,
      store: transaction.store,
      item: transaction.item,
      transactionType: transaction.transactionType,
      quantity: transaction.quantity.toNumber(),
      unitCost: transaction.unitCost.toNumber(),
      totalValue: transaction.totalValue.toNumber(),
      newQuantity: newQty,
      newWac: newWac,
    }, 'Transaction recorded successfully', 201);
  } catch (error) {
    console.error('Create transaction error:', error);
    return apiError('Failed to create transaction', 500);
  }
}
