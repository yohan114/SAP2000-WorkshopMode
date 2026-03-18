import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

const completeSchema = z.object({
  completedBy: z.string().min(1, 'Completed by is required'),
  notes: z.string().optional(),
});

// POST - Complete stock take
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = completeSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { completedBy, notes } = result.data;

    // Get stock take with lines
    const stockTake = await db.stockTakeHeader.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: { select: { itemCode: true, name: true } }
          }
        }
      }
    });

    if (!stockTake) {
      return apiNotFound('Stock take');
    }

    if (stockTake.status !== 'IN_PROGRESS') {
      return apiError('Stock take must be in progress to complete', 400);
    }

    // Check if all items have been counted
    const uncountedLines = stockTake.lines.filter(l => l.countedQty === null);
    if (uncountedLines.length > 0) {
      return apiError(`Cannot complete: ${uncountedLines.length} items have not been counted`, 400);
    }

    // Complete the stock take
    const updated = await db.stockTakeHeader.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy,
        notes: notes || stockTake.notes,
      },
      include: {
        store: true,
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } }
          }
        }
      }
    });

    // Generate completion summary
    const summary = {
      stockTakeNumber: updated.stockTakeNumber,
      store: updated.store.name,
      completedAt: updated.completedAt,
      totalItems: updated.totalItems,
      varianceItems: updated.varianceItems,
      significantVariances: updated.lines.filter(l => l.isSignificant).length,
      totalVarianceValue: updated.totalVarianceValue?.toNumber() || 0,
      positiveVariance: updated.positiveVariance?.toNumber() || 0,
      negativeVariance: updated.negativeVariance?.toNumber() || 0,
      significantVarianceLines: updated.lines
        .filter(l => l.isSignificant)
        .map(l => ({
          itemCode: l.item?.itemCode,
          itemName: l.item?.name,
          systemQty: l.systemQty.toNumber(),
          countedQty: l.countedQty?.toNumber(),
          variance: l.variance?.toNumber(),
          varianceValue: l.varianceValue?.toNumber(),
          reason: l.varianceReason || 'Unexplained',
        }))
    };

    return apiSuccess({
      ...updated,
      lines: updated.lines.map(l => ({
        ...l,
        systemQty: l.systemQty.toNumber(),
        countedQty: l.countedQty?.toNumber(),
        variance: l.variance?.toNumber(),
        varianceValue: l.varianceValue?.toNumber(),
        unitCost: l.unitCost.toNumber(),
      })),
      summary,
    }, 'Stock take completed successfully');
  } catch (error) {
    console.error('Complete stock take error:', error);
    return apiError('Failed to complete stock take', 500);
  }
}
