import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';

const createAdjustmentSchema = z.object({
  requestedBy: z.string().min(1, 'Requested by is required'),
  notes: z.string().optional(),
  lineIds: z.array(z.string()).optional(), // Specific lines, or all variance lines if not provided
  autoApprove: z.boolean().default(false), // For small adjustments
});

// GET - Get adjustments for a stock take
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const adjustments = await db.stockAdjustment.findMany({
      where: { stockTakeId: id },
      include: {
        lines: {
          include: {
            item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
          }
        },
        store: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return apiSuccess(adjustments.map(adj => ({
      ...adj,
      totalValue: adj.totalValue.toNumber(),
      lines: adj.lines.map(l => ({
        ...l,
        adjustmentQty: l.adjustmentQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalValue: l.totalValue.toNumber(),
      }))
    })));
  } catch (error) {
    console.error('Get adjustments error:', error);
    return apiError('Failed to fetch adjustments', 500);
  }
}

// POST - Create adjustment from stock take variance
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = createAdjustmentSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { requestedBy, notes, lineIds, autoApprove } = result.data;

    // Get stock take with variance lines
    const stockTake = await db.stockTakeHeader.findUnique({
      where: { id },
      include: {
        store: true,
        lines: {
          where: { 
            variance: { not: 0 },
            adjustmentPosted: false,
            ...(lineIds ? { id: { in: lineIds } } : {})
          },
          include: {
            item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } }
          }
        }
      }
    });

    if (!stockTake) {
      return apiNotFound('Stock take');
    }

    if (stockTake.status !== 'COMPLETED') {
      return apiError('Stock take must be completed before creating adjustments', 400);
    }

    if (stockTake.lines.length === 0) {
      return apiError('No variance lines available for adjustment', 400);
    }

    // Calculate total adjustment value
    const totalValue = stockTake.lines.reduce((sum, line) => {
      return sum + (line.varianceValue?.toNumber() || 0);
    }, 0);

    // Generate adjustment number
    const adjCount = await db.stockAdjustment.count();
    const adjustmentNumber = generateDocumentNumber('ADJ', adjCount + 1);

    // Determine if auto-approval is allowed (e.g., small value adjustments)
    const AUTO_APPROVE_THRESHOLD = 500; // $500
    const shouldAutoApprove = autoApprove && Math.abs(totalValue) <= AUTO_APPROVE_THRESHOLD;

    // Create adjustment
    const adjustment = await db.$transaction(async (tx) => {
      const adj = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          stockTakeId: id,
          storeId: stockTake.storeId,
          adjustmentType: 'COUNT_VARIANCE',
          status: shouldAutoApprove ? 'APPROVED' : 'DRAFT',
          totalValue,
          requestedBy,
          approvedBy: shouldAutoApprove ? requestedBy : null,
          approvedAt: shouldAutoApprove ? new Date() : null,
          notes,
          lines: {
            create: stockTake.lines.map(line => ({
              itemId: line.itemId,
              adjustmentQty: line.variance!,
              unitCost: line.unitCost,
              totalValue: line.varianceValue!,
              varianceReason: line.varianceReason,
              notes: line.varianceNotes,
            }))
          }
        },
        include: {
          lines: {
            include: {
              item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
            }
          },
          store: true
        }
      });

      // Mark lines as having adjustment created
      await tx.stockTakeLine.updateMany({
        where: { id: { in: stockTake.lines.map(l => l.id) } },
        data: { adjustmentPosted: true }
      });

      return adj;
    });

    return apiSuccess({
      ...adjustment,
      totalValue: adjustment.totalValue.toNumber(),
      lines: adjustment.lines.map(l => ({
        ...l,
        adjustmentQty: l.adjustmentQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalValue: l.totalValue.toNumber(),
      })),
      autoApproved: shouldAutoApprove,
    }, 'Adjustment created successfully', 201);
  } catch (error) {
    console.error('Create adjustment error:', error);
    return apiError('Failed to create adjustment', 500);
  }
}
