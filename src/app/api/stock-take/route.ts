import { db } from '@/lib/db';
import { apiSuccess, apiError, apiPaginated, parsePagination, getSkip, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Variance reason codes
export const VARIANCE_REASONS = [
  { code: 'COUNT_ERROR', description: 'Counting error' },
  { code: 'THEFT', description: 'Theft/Pilferage' },
  { code: 'DAMAGE', description: 'Damage/Breakage' },
  { code: 'EXPIRY', description: 'Expiry/Obsolescence' },
  { code: 'RECEIVING_ERROR', description: 'Receiving error' },
  { code: 'ISSUE_ERROR', description: 'Issue error' },
  { code: 'SYSTEM_ERROR', description: 'System error' },
  { code: 'TRANSIT_LOSS', description: 'Transit loss' },
  { code: 'OTHER', description: 'Other (specify in notes)' },
];

// Significance thresholds
const VARIANCE_PERCENT_THRESHOLD = 5; // 5%
const VARIANCE_VALUE_THRESHOLD = 100; // $100

const createStockTakeSchema = z.object({
  storeId: z.string().min(1, 'Store is required'),
  countMethod: z.enum(['FULL', 'CYCLE', 'SPOT_CHECK']).default('FULL'),
  scheduledDate: z.string().transform(v => new Date(v)),
  blindCount: z.boolean().default(true),
  notes: z.string().optional(),
  initiatedBy: z.string().min(1, 'Initiator is required'),
  itemIds: z.array(z.string()).optional(), // For cycle/spot check
});

// GET - List stock takes with statistics
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);
    
    const status = url.searchParams.get('status') || 'all';
    const storeId = url.searchParams.get('storeId');
    const period = url.searchParams.get('period'); // current month

    const where: Record<string, unknown> = { deletedAt: null };
    if (status !== 'all') where.status = status;
    if (storeId) where.storeId = storeId;
    
    // Period filter (current month by default for statistics)
    if (period === 'current') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      where.createdAt = { gte: startOfMonth };
    }

    const [stockTakes, total] = await Promise.all([
      db.stockTakeHeader.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, code: true } },
          lines: {
            select: {
              id: true,
              countedQty: true,
              variance: true,
              varianceValue: true,
              isSignificant: true,
            }
          }
        }
      }),
      db.stockTakeHeader.count({ where })
    ]);

    // Calculate statistics for period
    const periodWhere = { deletedAt: null };
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodStats = await db.stockTakeHeader.aggregate({
      where: { ...periodWhere, createdAt: { gte: periodStart } },
      _count: { id: true },
      _sum: { 
        totalVarianceValue: true, 
        positiveVariance: true, 
        negativeVariance: true,
        totalItems: true,
        countedItems: true,
      },
    });

    // Calculate completion rate
    const completedCount = await db.stockTakeHeader.count({
      where: { ...periodWhere, status: 'COMPLETED', createdAt: { gte: periodStart } }
    });
    const completionRate = periodStats._count.id > 0 
      ? Math.round((completedCount / periodStats._count.id) * 100) 
      : 0;

    // Calculate average count accuracy (lines with 0 variance / total lines)
    const linesWithVariance = await db.stockTakeLine.count({
      where: {
        stockTake: { createdAt: { gte: periodStart } },
        countedQty: { not: null }
      }
    });
    const linesWithZeroVariance = await db.stockTakeLine.count({
      where: {
        stockTake: { createdAt: { gte: periodStart } },
        countedQty: { not: null },
        variance: 0
      }
    });
    const avgAccuracy = linesWithVariance > 0 
      ? Math.round((linesWithZeroVariance / linesWithVariance) * 100) 
      : 100;

    const response = {
      stockTakes: stockTakes.map(st => ({
        ...st,
        totalVarianceValue: st.totalVarianceValue?.toNumber() || 0,
        positiveVariance: st.positiveVariance?.toNumber() || 0,
        negativeVariance: st.negativeVariance?.toNumber() || 0,
        progressPercentage: st.totalItems > 0 
          ? Math.round((st.countedItems / st.totalItems) * 100) 
          : 0,
        lines: undefined, // Don't return all lines in list
      })),
      statistics: {
        totalStockTakes: periodStats._count.id,
        totalVarianceValue: periodStats._sum.totalVarianceValue?.toNumber() || 0,
        positiveVariance: periodStats._sum.positiveVariance?.toNumber() || 0,
        negativeVariance: periodStats._sum.negativeVariance?.toNumber() || 0,
        completionRate,
        averageCountAccuracy: avgAccuracy,
      }
    };

    return apiPaginated(response.stockTakes, total, page, limit);
  } catch (error) {
    console.error('Get stock takes error:', error);
    return apiError('Failed to fetch stock takes', 500);
  }
}

// POST - Create new stock take
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createStockTakeSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { storeId, countMethod, scheduledDate, blindCount, notes, initiatedBy, itemIds } = result.data;

    // Verify store exists
    const store = await db.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return apiError('Store not found', 404);
    }

    // Generate stock take number
    const count = await db.stockTakeHeader.count();
    const stockTakeNumber = generateDocumentNumber('ST', count + 1);

    // Get items to count based on method
    let stockItems;
    if (countMethod === 'CYCLE' && itemIds && itemIds.length > 0) {
      // Cycle count - specific items
      stockItems = await db.storeStock.findMany({
        where: { storeId, itemId: { in: itemIds } },
        include: { 
          item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } } 
        },
      });
    } else if (countMethod === 'SPOT_CHECK') {
      // Spot check - random sample (e.g., 20 items or 10% of stock)
      const allStock = await db.storeStock.findMany({
        where: { storeId, availableQty: { gt: 0 } },
        include: { 
          item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } } 
        },
      });
      
      // Random sample
      const sampleSize = Math.min(20, Math.ceil(allStock.length * 0.1));
      stockItems = allStock.sort(() => Math.random() - 0.5).slice(0, sampleSize);
    } else {
      // Full count - all items with stock
      stockItems = await db.storeStock.findMany({
        where: { storeId, availableQty: { gt: 0 } },
        include: { 
          item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } } 
        },
      });
    }

    // Create stock take with lines in transaction
    const stockTake = await db.$transaction(async (tx) => {
      const header = await tx.stockTakeHeader.create({
        data: {
          stockTakeNumber,
          storeId,
          countMethod,
          scheduledDate,
          blindCount,
          notes,
          initiatedBy,
          totalItems: stockItems.length,
          lines: {
            create: stockItems.map(item => ({
              itemId: item.itemId,
              systemQty: item.availableQty,
              unitCost: item.wac,
              location: '', // Can be populated later
            }))
          }
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

      return header;
    });

    return apiSuccess({
      ...stockTake,
      systemQty: stockTake.lines[0]?.systemQty?.toNumber() || 0,
      unitCost: stockTake.lines[0]?.unitCost?.toNumber() || 0,
      lines: stockTake.lines.map(l => ({
        ...l,
        systemQty: l.systemQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        variance: l.variance?.toNumber() || null,
        variancePercent: l.variancePercent?.toNumber() || null,
        varianceValue: l.varianceValue?.toNumber() || null,
      }))
    }, 'Stock take created successfully', 201);
  } catch (error) {
    console.error('Create stock take error:', error);
    return apiError('Failed to create stock take', 500);
  }
}
