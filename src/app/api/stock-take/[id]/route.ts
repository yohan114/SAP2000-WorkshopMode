import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

// GET - Get single stock take with all details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const stockTake = await db.stockTakeHeader.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, code: true, location: true } },
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
          },
          orderBy: { item: { itemCode: 'asc' } }
        },
        adjustments: {
          include: {
            lines: {
              include: {
                item: { select: { itemCode: true, name: true } }
              }
            }
          }
        }
      }
    });

    if (!stockTake) {
      return apiNotFound('Stock take');
    }

    // Calculate variance summary
    const varianceSummary = {
      totalLines: stockTake.lines.length,
      countedLines: stockTake.lines.filter(l => l.countedQty !== null).length,
      varianceLines: stockTake.lines.filter(l => l.variance !== null && l.variance?.toNumber() !== 0).length,
      significantVariances: stockTake.lines.filter(l => l.isSignificant).length,
      positiveVarianceCount: stockTake.lines.filter(l => l.variance && l.variance.toNumber() > 0).length,
      negativeVarianceCount: stockTake.lines.filter(l => l.variance && l.variance.toNumber() < 0).length,
    };

    // Group variances by reason
    const variancesByReason = stockTake.lines.reduce((acc, line) => {
      if (line.variance?.toNumber() !== 0 && line.variance !== null) {
        const reason = line.varianceReason || 'UNEXPLAINED';
        if (!acc[reason]) {
          acc[reason] = { count: 0, totalValue: 0, lines: [] };
        }
        acc[reason].count++;
        acc[reason].totalValue += line.varianceValue?.toNumber() || 0;
        acc[reason].lines.push({
          itemId: line.itemId,
          itemCode: line.item?.itemCode,
          itemName: line.item?.name,
          variance: line.variance.toNumber(),
          varianceValue: line.varianceValue?.toNumber() || 0,
        });
      }
      return acc;
    }, {} as Record<string, { count: number; totalValue: number; lines: Array<{ itemId: string; itemCode?: string; itemName?: string; variance: number; varianceValue: number }> }>);

    const response = {
      ...stockTake,
      totalVarianceValue: stockTake.totalVarianceValue?.toNumber() || 0,
      positiveVariance: stockTake.positiveVariance?.toNumber() || 0,
      negativeVariance: stockTake.negativeVariance?.toNumber() || 0,
      progressPercentage: stockTake.totalItems > 0 
        ? Math.round((stockTake.countedItems / stockTake.totalItems) * 100) 
        : 0,
      lines: stockTake.lines.map(l => ({
        ...l,
        systemQty: l.systemQty.toNumber(),
        countedQty: l.countedQty?.toNumber() ?? null,
        variance: l.variance?.toNumber() ?? null,
        variancePercent: l.variancePercent?.toNumber() ?? null,
        varianceValue: l.varianceValue?.toNumber() ?? null,
        unitCost: l.unitCost.toNumber(),
      })),
      varianceSummary,
      variancesByReason,
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Get stock take error:', error);
    return apiError('Failed to fetch stock take', 500);
  }
}

const updateStockTakeSchema = z.object({
  action: z.enum(['start', 'count', 'cancel']).optional(),
  lines: z.array(z.object({
    id: z.string(),
    countedQty: z.number().nullable(),
    varianceReason: z.string().optional(),
    varianceNotes: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
});

// PATCH - Update stock take (start, record counts, cancel)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateStockTakeSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { action, lines, notes } = result.data;

    // Get existing stock take
    const stockTake = await db.stockTakeHeader.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!stockTake) {
      return apiNotFound('Stock take');
    }

    if (action === 'start') {
      // Start the count
      if (stockTake.status !== 'SCHEDULED') {
        return apiError('Stock take cannot be started', 400);
      }

      const updated = await db.stockTakeHeader.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          notes: notes || stockTake.notes,
        }
      });

      return apiSuccess(updated, 'Stock take started');
    }

    if (action === 'cancel') {
      if (!['SCHEDULED', 'IN_PROGRESS'].includes(stockTake.status)) {
        return apiError('Stock take cannot be cancelled', 400);
      }

      const updated = await db.stockTakeHeader.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: notes || stockTake.notes,
        }
      });

      return apiSuccess(updated, 'Stock take cancelled');
    }

    if (action === 'count' && lines) {
      // Record counts
      if (stockTake.status !== 'IN_PROGRESS') {
        return apiError('Stock take is not in progress', 400);
      }

      // Update lines with count data
      const PERCENT_THRESHOLD = 5;
      const VALUE_THRESHOLD = 100;

      await db.$transaction(async (tx) => {
        let countedItems = 0;
        let varianceItems = 0;
        let totalVarianceValue = 0;
        let positiveVariance = 0;
        let negativeVariance = 0;

        for (const lineUpdate of lines) {
          const existingLine = stockTake.lines.find(l => l.id === lineUpdate.id);
          if (!existingLine) continue;

          const systemQty = existingLine.systemQty.toNumber();
          const unitCost = existingLine.unitCost.toNumber();
          const countedQty = lineUpdate.countedQty;
          const variance = countedQty !== null ? countedQty - systemQty : null;
          const variancePercent = variance !== null && systemQty > 0 
            ? (variance / systemQty) * 100 
            : null;
          const varianceValue = variance !== null ? variance * unitCost : null;
          
          // Check significance
          const isSignificant = variance !== null && variance !== 0 && (
            Math.abs(variancePercent || 0) >= PERCENT_THRESHOLD ||
            Math.abs(varianceValue || 0) >= VALUE_THRESHOLD
          );

          if (countedQty !== null) {
            countedItems++;
            if (variance !== 0) {
              varianceItems++;
              totalVarianceValue += varianceValue || 0;
              if (variance! > 0) positiveVariance += varianceValue || 0;
              else negativeVariance += Math.abs(varianceValue || 0);
            }
          }

          await tx.stockTakeLine.update({
            where: { id: lineUpdate.id },
            data: {
              countedQty,
              variance,
              variancePercent,
              varianceValue,
              varianceReason: lineUpdate.varianceReason,
              varianceNotes: lineUpdate.varianceNotes,
              isSignificant,
              countedAt: countedQty !== null ? new Date() : null,
            }
          });
        }

        // Update header stats
        await tx.stockTakeHeader.update({
          where: { id },
          data: {
            countedItems,
            varianceItems,
            totalVarianceValue,
            positiveVariance,
            negativeVariance,
          }
        });
      });

      // Return updated stock take
      const updated = await db.stockTakeHeader.findUnique({
        where: { id },
        include: {
          store: true,
          lines: {
            include: {
              item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } }
            }
          }
        }
      });

      return apiSuccess({
        ...updated,
        lines: updated?.lines.map(l => ({
          ...l,
          systemQty: l.systemQty.toNumber(),
          countedQty: l.countedQty?.toNumber() ?? null,
          variance: l.variance?.toNumber() ?? null,
          variancePercent: l.variancePercent?.toNumber() ?? null,
          varianceValue: l.varianceValue?.toNumber() ?? null,
          unitCost: l.unitCost.toNumber(),
        }))
      }, 'Count saved successfully');
    }

    return apiError('Invalid action', 400);
  } catch (error) {
    console.error('Update stock take error:', error);
    return apiError('Failed to update stock take', 500);
  }
}

// DELETE - Soft delete stock take
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const stockTake = await db.stockTakeHeader.findUnique({
      where: { id }
    });

    if (!stockTake) {
      return apiNotFound('Stock take');
    }

    if (!['SCHEDULED', 'CANCELLED'].includes(stockTake.status)) {
      return apiError('Only scheduled or cancelled stock takes can be deleted', 400);
    }

    await db.stockTakeHeader.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return apiSuccess({ id }, 'Stock take deleted');
  } catch (error) {
    console.error('Delete stock take error:', error);
    return apiError('Failed to delete stock take', 500);
  }
}
