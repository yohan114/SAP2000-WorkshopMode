import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';

// GET - Get single adjustment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, code: true, location: true } },
        stockTake: { 
          select: { 
            stockTakeNumber: true, 
            scheduledDate: true,
            status: true 
          } 
        },
        lines: {
          include: {
            item: { 
              select: { 
                id: true, 
                itemCode: true, 
                name: true, 
                unitOfMeasure: true,
                itemClass: true,
              } 
            }
          }
        }
      }
    });

    if (!adjustment) {
      return apiNotFound('Adjustment');
    }

    return apiSuccess({
      ...adjustment,
      totalValue: adjustment.totalValue.toNumber(),
      lines: adjustment.lines.map(l => ({
        ...l,
        adjustmentQty: l.adjustmentQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalValue: l.totalValue.toNumber(),
      }))
    });
  } catch (error) {
    console.error('Get adjustment error:', error);
    return apiError('Failed to fetch adjustment', 500);
  }
}

// DELETE - Delete adjustment (only draft)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      include: { stockTake: true }
    });

    if (!adjustment) {
      return apiNotFound('Adjustment');
    }

    if (adjustment.status !== 'DRAFT') {
      return apiError('Only draft adjustments can be deleted', 400);
    }

    await db.$transaction(async (tx) => {
      // Delete lines first
      await tx.stockAdjustmentLine.deleteMany({
        where: { adjustmentId: id }
      });
      
      // Delete adjustment
      await tx.stockAdjustment.delete({
        where: { id }
      });

      // If linked to stock take, reset the adjustmentPosted flag
      if (adjustment.stockTakeId) {
        await tx.stockTakeLine.updateMany({
          where: { 
            stockTakeId: adjustment.stockTakeId,
            itemId: { in: (await tx.stockAdjustmentLine.findMany({
              where: { adjustmentId: id },
              select: { itemId: true }
            })).map(l => l.itemId) }
          },
          data: { adjustmentPosted: false }
        });
      }
    });

    return apiSuccess({ id }, 'Adjustment deleted');
  } catch (error) {
    console.error('Delete adjustment error:', error);
    return apiError('Failed to delete adjustment', 500);
  }
}
