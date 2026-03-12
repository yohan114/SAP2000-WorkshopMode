import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for bulk stock adjustment
const bulkAdjustmentSchema = z.object({
  stockIds: z.array(z.string()).min(1, 'At least one stock item must be selected'),
  adjustmentType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required'),
});

// Schema for bulk stock transfer
const bulkTransferSchema = z.object({
  stockIds: z.array(z.string()).min(1, 'At least one stock item must be selected'),
  targetStoreId: z.string().min(1, 'Target store is required'),
  notes: z.string().optional(),
});

// Schema for bulk reorder suggestion acknowledgment
const bulkAcknowledgeSchema = z.object({
  stockIds: z.array(z.string()).min(1, 'At least one stock item must be selected'),
  action: z.enum(['ACKNOWLEDGE', 'DISMISS']),
});

// POST /api/inventory/bulk - Bulk operations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation } = body;

    switch (operation) {
      case 'ADJUST_STOCK':
        return await handleBulkAdjustment(body);
      case 'TRANSFER_STOCK':
        return await handleBulkTransfer(body);
      case 'ACKNOWLEDGE_ALERTS':
        return await handleBulkAcknowledge(body);
      default:
        return apiError('Invalid operation', 400);
    }
  } catch (error) {
    console.error('Bulk inventory operation error:', error);
    return apiError('Failed to perform bulk operation', 500);
  }
}

async function handleBulkAdjustment(body: Record<string, unknown>) {
  const result = bulkAdjustmentSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { stockIds, adjustmentType, quantity, reason } = result.data;

  // Get all stock items
  const stockItems = await db.storeStock.findMany({
    where: { id: { in: stockIds } },
    include: {
      store: { select: { id: true, name: true } },
      item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
    },
  });

  if (stockItems.length === 0) {
    return apiError('No stock items found', 404);
  }

  // Validate stock for ADJUSTMENT_OUT
  if (adjustmentType === 'ADJUSTMENT_OUT') {
    const insufficientStock = stockItems.filter(s => Number(s.availableQty) < quantity);
    if (insufficientStock.length > 0) {
      return apiError(
        'Insufficient stock for some items',
        400,
        insufficientStock.map(s => `${s.item.name}: Available ${s.availableQty}, Requested ${quantity}`).join('; ')
      );
    }
  }

  // Perform adjustments in a transaction
  const results = await db.$transaction(async (tx) => {
    const updates = [];

    for (const stock of stockItems) {
      const currentQty = Number(stock.availableQty);
      const currentWac = Number(stock.wac);
      let newQty: number;

      if (adjustmentType === 'ADJUSTMENT_IN') {
        newQty = currentQty + quantity;
      } else {
        newQty = currentQty - quantity;
      }

      // Update stock
      const updatedStock = await tx.storeStock.update({
        where: { id: stock.id },
        data: {
          availableQty: newQty,
          lastMovementAt: new Date(),
        },
      });

      // Create transaction record
      await tx.stockTransaction.create({
        data: {
          storeId: stock.storeId,
          itemId: stock.itemId,
          transactionType: adjustmentType,
          quantity: quantity,
          unitCost: currentWac,
          totalValue: quantity * currentWac,
          notes: reason,
          performedBy: (body.performedBy as string) || 'system',
        },
      });

      updates.push({
        id: stock.id,
        itemCode: stock.item.itemCode,
        itemName: stock.item.name,
        previousQty: currentQty,
        newQty: newQty,
        store: stock.store.name,
      });
    }

    return updates;
  });

  const totalAdjusted = stockItems.length;
  const action = adjustmentType === 'ADJUSTMENT_IN' ? 'added to' : 'removed from';

  return apiSuccess({
    adjusted: totalAdjusted,
    quantity,
    details: results,
  }, `Successfully ${action} ${totalAdjusted} item(s)`);
}

async function handleBulkTransfer(body: Record<string, unknown>) {
  const result = bulkTransferSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { stockIds, targetStoreId, notes } = result.data;

  // Verify target store exists
  const targetStore = await db.store.findUnique({
    where: { id: targetStoreId, isActive: true },
  });

  if (!targetStore) {
    return apiError('Target store not found', 404);
  }

  // Get all stock items
  const stockItems = await db.storeStock.findMany({
    where: { id: { in: stockIds } },
    include: {
      store: { select: { id: true, name: true } },
      item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
    },
  });

  if (stockItems.length === 0) {
    return apiError('No stock items found', 404);
  }

  // Prevent transfer to same store
  const sameStoreItems = stockItems.filter(s => s.storeId === targetStoreId);
  if (sameStoreItems.length > 0) {
    return apiError('Cannot transfer items to the same store they are currently in', 400);
  }

  // Check for items with zero or insufficient stock
  const itemsWithNoStock = stockItems.filter(s => Number(s.availableQty) === 0);
  if (itemsWithNoStock.length > 0) {
    return apiError(
      'Some items have zero stock and cannot be transferred',
      400,
      itemsWithNoStock.map(s => s.item.name).join(', ')
    );
  }

  // Perform transfers in a transaction
  const results = await db.$transaction(async (tx) => {
    const transfers = [];

    for (const stock of stockItems) {
      const transferQty = Number(stock.availableQty);
      const unitCost = Number(stock.wac);

      // Check if target store already has this item
      let targetStock = await tx.storeStock.findUnique({
        where: {
          storeId_itemId: {
            storeId: targetStoreId,
            itemId: stock.itemId,
          },
        },
      });

      if (!targetStock) {
        // Create stock record in target store
        targetStock = await tx.storeStock.create({
          data: {
            storeId: targetStoreId,
            itemId: stock.itemId,
            availableQty: 0,
            reservedQty: 0,
            quarantineQty: 0,
            wac: unitCost,
          },
        });
      }

      // Calculate new WAC for target
      const targetCurrentQty = Number(targetStock.availableQty);
      const targetCurrentWac = Number(targetStock.wac);
      const newTargetQty = targetCurrentQty + transferQty;
      const newTargetWac = targetCurrentQty > 0
        ? ((targetCurrentQty * targetCurrentWac) + (transferQty * unitCost)) / newTargetQty
        : unitCost;

      // Update source stock (reduce to 0)
      await tx.storeStock.update({
        where: { id: stock.id },
        data: {
          availableQty: 0,
          lastMovementAt: new Date(),
        },
      });

      // Create TRANSFER_OUT transaction for source
      await tx.stockTransaction.create({
        data: {
          storeId: stock.storeId,
          itemId: stock.itemId,
          transactionType: 'TRANSFER_OUT',
          quantity: transferQty,
          unitCost: unitCost,
          totalValue: transferQty * unitCost,
          notes: notes || `Transfer to ${targetStore.name}`,
          performedBy: (body.performedBy as string) || 'system',
        },
      });

      // Update target stock
      await tx.storeStock.update({
        where: { id: targetStock.id },
        data: {
          availableQty: newTargetQty,
          wac: newTargetWac,
          lastMovementAt: new Date(),
        },
      });

      // Create TRANSFER_IN transaction for target
      await tx.stockTransaction.create({
        data: {
          storeId: targetStoreId,
          itemId: stock.itemId,
          transactionType: 'TRANSFER_IN',
          quantity: transferQty,
          unitCost: unitCost,
          totalValue: transferQty * unitCost,
          notes: notes || `Transfer from ${stock.store.name}`,
          performedBy: (body.performedBy as string) || 'system',
        },
      });

      transfers.push({
        id: stock.id,
        itemCode: stock.item.itemCode,
        itemName: stock.item.name,
        quantity: transferQty,
        fromStore: stock.store.name,
        toStore: targetStore.name,
      });
    }

    return transfers;
  });

  return apiSuccess({
    transferred: stockItems.length,
    targetStore: targetStore.name,
    details: results,
  }, `Successfully transferred ${stockItems.length} item(s) to ${targetStore.name}`);
}

async function handleBulkAcknowledge(body: Record<string, unknown>) {
  const result = bulkAcknowledgeSchema.safeParse(body);
  if (!result.success) {
    return apiError('Validation failed', 400, result.error.errors[0]?.message);
  }

  const { stockIds, action } = result.data;

  // For now, this is a placeholder for alert acknowledgment
  // In a full implementation, this would update an alert status
  // The current schema doesn't have a dedicated alerts table with acknowledgment status

  return apiSuccess({
    acknowledged: stockIds.length,
    action,
  }, `Successfully ${action.toLowerCase()} ${stockIds.length} alert(s)`);
}
