import { db } from '@/lib/db';
import { apiSuccess, apiError, apiPaginated, parsePagination, getSkip, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @openapi
 * /api/stock-take:
 *   get:
 *     tags:
 *       - Stock Take
 *     summary: List all stock takes
 *     description: Retrieve a paginated list of stock takes with optional filtering by status and store. Includes statistics for the current period.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for stock take number
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/StockTakeStatus'
 *         description: Filter by stock take status (or 'all')
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [current]
 *         description: Filter to current month period
 *     responses:
 *       200:
 *         description: List of stock takes with pagination and statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/StockTake'
 *                           - type: object
 *                             properties:
 *                               store:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                                   code:
 *                                     type: string
 *                               progressPercentage:
 *                                 type: integer
 *                                 description: Completion percentage
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalStockTakes:
 *                           type: integer
 *                         totalVarianceValue:
 *                           type: number
 *                         positiveVariance:
 *                           type: number
 *                         negativeVariance:
 *                           type: number
 *                         completionRate:
 *                           type: integer
 *                           description: Completion rate percentage
 *                         averageCountAccuracy:
 *                           type: integer
 *                           description: Average count accuracy percentage
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Stock Take
 *     summary: Create a new stock take
 *     description: Create a new stock take for a store. Supports full count, cycle count, or spot check methods. Stock take number is auto-generated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStockTakeInput'
 *     responses:
 *       201:
 *         description: Stock take created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StockTake'
 *                 - type: object
 *                   properties:
 *                     store:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                     lines:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           itemId:
 *                             type: string
 *                           systemQty:
 *                             type: number
 *                           unitCost:
 *                             type: number
 *                           item:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               itemCode:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               unitOfMeasure:
 *                                 type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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

import { getCurrentUser } from '@/lib/auth/session';

// ... other imports ...

const createStockTakeSchema = z.object({
  storeId: z.string().min(1, 'Store is required'),
  countMethod: z.enum(['FULL', 'CYCLE', 'SPOT_CHECK']).optional(),
  countType: z.enum(['FULL', 'CYCLE', 'SPOT_CHECK']).optional(), // Accept frontend's field name
  scheduledDate: z.string().transform(v => new Date(v)),
  blindCount: z.boolean().default(true),
  notes: z.string().optional(),
  initiatedBy: z.string().optional(),
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

    const { storeId, scheduledDate, blindCount, notes, itemIds } = result.data;
    
    // Support either frontend formulation
    const countMethod = result.data.countMethod || result.data.countType || 'FULL';
    
    const currentUser = await getCurrentUser();
    const initiatedBy = result.data.initiatedBy || currentUser?.id || 'unknown';

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
