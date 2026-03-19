import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';

const postSchema = z.object({
  postedBy: z.string().min(1, 'Posted by is required'),
  notes: z.string().optional(),
});

// POST - Post adjustment (update stock)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = postSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { postedBy, notes } = result.data;

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
          }
        },
        store: true,
        stockTake: true
      }
    });

    if (!adjustment) {
      return apiNotFound('Adjustment');
    }

    if (adjustment.status !== 'APPROVED') {
      return apiError('Adjustment must be approved before posting', 400);
    }

    if (adjustment.postedAt) {
      return apiError('Adjustment has already been posted', 400);
    }

    // Post the adjustment - update stock levels
    await db.$transaction(async (tx) => {
      // Process each line
      for (const line of adjustment.lines) {
        const adjustmentQty = line.adjustmentQty.toNumber();
        const unitCost = line.unitCost.toNumber();
        const totalValue = line.totalValue.toNumber();

        // Get current stock
        const stock = await tx.storeStock.findUnique({
          where: {
            storeId_itemId: {
              storeId: adjustment.storeId,
              itemId: line.itemId
            }
          }
        });

        if (!stock) {
          // Create stock record if doesn't exist (for positive adjustments)
          if (adjustmentQty > 0) {
            await tx.storeStock.create({
              data: {
                storeId: adjustment.storeId,
                itemId: line.itemId,
                availableQty: adjustmentQty,
                wac: unitCost,
                lastMovementAt: new Date(),
              }
            });
          }
          continue;
        }

        // Check for negative stock
        const currentQty = stock.availableQty.toNumber();
        if (currentQty + adjustmentQty < 0) {
          throw new Error(`Insufficient stock for item ${line.item?.itemCode}. Available: ${currentQty}, Adjustment: ${adjustmentQty}`);
        }

        // Update stock
        const newQty = currentQty + adjustmentQty;
        
        // Calculate new WAC (Weighted Average Cost) for positive adjustments
        let newWac = stock.wac.toNumber();
        if (adjustmentQty > 0 && unitCost > 0) {
          const currentTotalValue = currentQty * stock.wac.toNumber();
          const adjustmentTotalValue = adjustmentQty * unitCost;
          const totalQty = currentQty + adjustmentQty;
          newWac = totalQty > 0 ? (currentTotalValue + adjustmentTotalValue) / totalQty : unitCost;
        }

        await tx.storeStock.update({
          where: { id: stock.id },
          data: {
            availableQty: newQty,
            wac: newWac,
            lastMovementAt: new Date(),
          }
        });

        // Create stock transaction
        await tx.stockTransaction.create({
          data: {
            storeId: adjustment.storeId,
            itemId: line.itemId,
            transactionType: adjustmentQty > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            quantity: Math.abs(adjustmentQty),
            unitCost,
            totalValue: Math.abs(totalValue),
            referenceType: 'STOCK_ADJUSTMENT',
            referenceId: adjustment.id,
            performedBy: postedBy,
            notes: `Adjustment: ${adjustment.adjustmentNumber}. ${notes || ''}`,
          }
        });
      }

      // Mark adjustment as posted
      await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: 'POSTED',
          postedBy,
          postedAt: new Date(),
          notes: notes ? `${adjustment.notes || ''}\nPosted: ${notes}` : adjustment.notes,
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'StockAdjustment',
          entityId: id,
          action: 'POSTED',
          newValue: JSON.stringify({
            adjustmentNumber: adjustment.adjustmentNumber,
            totalValue: adjustment.totalValue.toNumber(),
            linesPosted: adjustment.lines.length,
            postedBy,
            postedAt: new Date(),
          }),
          actorId: postedBy,
        }
      });
    });

    // Return updated adjustment
    const updated = await db.stockAdjustment.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
          }
        },
        store: true
      }
    });

    return apiSuccess({
      ...updated,
      totalValue: updated?.totalValue.toNumber() || 0,
      lines: updated?.lines.map(l => ({
        ...l,
        adjustmentQty: l.adjustmentQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalValue: l.totalValue.toNumber(),
      })) || [],
    }, 'Adjustment posted successfully. Stock levels updated.');
  } catch (error) {
    console.error('Post adjustment error:', error);
    if (error instanceof Error && error.message.includes('Insufficient stock')) {
      return apiError(error.message, 400);
    }
    return apiError('Failed to post adjustment', 500);
  }
}
