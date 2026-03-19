import { db } from '@/lib/db';
import { apiSuccess, apiError, apiPaginated, parsePagination, getSkip, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';

const createAdjustmentSchema = z.object({
  storeId: z.string().min(1, 'Store is required'),
  adjustmentType: z.enum(['COUNT_VARIANCE', 'DAMAGE', 'LOSS', 'THEFT', 'CORRECTION', 'TRANSFER']).default('CORRECTION'),
  requestedBy: z.string().min(1, 'Requested by is required'),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    adjustmentQty: z.number(), // Positive for add, negative for remove
    unitCost: z.number().optional(),
    varianceReason: z.string().optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one line is required'),
});

// GET - List all adjustments
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url);
    const skip = getSkip(page, limit);
    
    const status = url.searchParams.get('status') || 'all';
    const storeId = url.searchParams.get('storeId');
    const adjustmentType = url.searchParams.get('adjustmentType');

    const where: Record<string, unknown> = {};
    if (status !== 'all') where.status = status;
    if (storeId) where.storeId = storeId;
    if (adjustmentType) where.adjustmentType = adjustmentType;

    const [adjustments, total] = await Promise.all([
      db.stockAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, code: true } },
          stockTake: { select: { stockTakeNumber: true } },
          lines: {
            include: {
              item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
            }
          }
        }
      }),
      db.stockAdjustment.count({ where })
    ]);

    return apiPaginated(
      adjustments.map(adj => ({
        ...adj,
        totalValue: adj.totalValue.toNumber(),
        lines: adj.lines.map(l => ({
          ...l,
          adjustmentQty: l.adjustmentQty.toNumber(),
          unitCost: l.unitCost.toNumber(),
          totalValue: l.totalValue.toNumber(),
        }))
      })),
      total,
      page,
      limit
    );
  } catch (error) {
    console.error('Get adjustments error:', error);
    return apiError('Failed to fetch adjustments', 500);
  }
}

// POST - Create standalone adjustment (not from stock take)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createAdjustmentSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { storeId, adjustmentType, requestedBy, notes, lines } = result.data;

    // Verify store exists
    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return apiError('Store not found', 404);
    }

    // Get stock info and calculate values
    const stockItems = await db.storeStock.findMany({
      where: {
        storeId,
        itemId: { in: lines.map(l => l.itemId) }
      }
    });

    const adjustmentLines = lines.map(line => {
      const stock = stockItems.find(s => s.itemId === line.itemId);
      const unitCost = line.unitCost || stock?.wac.toNumber() || 0;
      const adjustmentQty = line.adjustmentQty;
      
      return {
        itemId: line.itemId,
        adjustmentQty,
        unitCost,
        totalValue: adjustmentQty * unitCost,
        varianceReason: line.varianceReason,
        notes: line.notes,
      };
    });

    const totalValue = adjustmentLines.reduce((sum, l) => sum + l.totalValue, 0);

    // Generate adjustment number
    const adjCount = await db.stockAdjustment.count();
    const adjustmentNumber = generateDocumentNumber('ADJ', adjCount + 1);

    // Create adjustment
    const adjustment = await db.stockAdjustment.create({
      data: {
        adjustmentNumber,
        storeId,
        adjustmentType,
        status: 'DRAFT',
        totalValue,
        requestedBy,
        notes,
        lines: {
          create: adjustmentLines
        }
      },
      include: {
        store: true,
        lines: {
          include: {
            item: { select: { itemCode: true, name: true, unitOfMeasure: true } }
          }
        }
      }
    });

    return apiSuccess({
      ...adjustment,
      totalValue: adjustment.totalValue.toNumber(),
      lines: adjustment.lines.map(l => ({
        ...l,
        adjustmentQty: l.adjustmentQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalValue: l.totalValue.toNumber(),
      }))
    }, 'Adjustment created successfully', 201);
  } catch (error) {
    console.error('Create adjustment error:', error);
    return apiError('Failed to create adjustment', 500);
  }
}
