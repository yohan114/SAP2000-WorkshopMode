import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound, 
  apiValidationError,
} from '@/lib/api-utils';
import { z } from 'zod';

// Cost types enum
const CostType = {
  LABOR: 'LABOR',
  MATERIALS: 'MATERIALS',
  TRANSPORT: 'TRANSPORT',
  EQUIPMENT: 'EQUIPMENT',
  TESTING: 'TESTING',
  MISC: 'MISC',
} as const;

// Schema for creating cost entry
const createCostSchema = z.object({
  costType: z.enum(['LABOR', 'MATERIALS', 'TRANSPORT', 'EQUIPMENT', 'TESTING', 'MISC']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  invoiceRef: z.string().optional(),
  costDate: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/external-jobs/[id]/costs - Get cost breakdown
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify external job exists
    const externalJob = await db.externalJob.findUnique({
      where: { id },
      select: { 
        id: true, 
        isActive: true, 
        estimatedCost: true,
        actualCost: true,
        status: true,
      },
    });

    if (!externalJob || !externalJob.isActive) {
      return apiNotFound('External job');
    }

    // Get all costs for this job
    const costs = await db.extJobCost.findMany({
      where: { externalJobId: id },
      orderBy: { costDate: 'desc' },
    });

    // Calculate breakdown by cost type
    const breakdownByType = costs.reduce((acc, cost) => {
      const type = cost.costType;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          count: 0,
          entries: [],
        };
      }
      acc[type].total += Number(cost.amount);
      acc[type].count += 1;
      acc[type].entries.push({
        id: cost.id,
        description: cost.description,
        amount: Number(cost.amount),
        invoiceRef: cost.invoiceRef,
        costDate: cost.costDate,
      });
      return acc;
    }, {} as Record<string, { total: number; count: number; entries: Array<{ id: string; description: string; amount: number; invoiceRef: string | null; costDate: Date }> }>);

    // Total actual costs
    const totalActualCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);

    // Variance analysis
    const estimatedCost = Number(externalJob.estimatedCost || 0);
    const variance = estimatedCost > 0 ? totalActualCosts - estimatedCost : null;
    const variancePercentage = estimatedCost > 0 
      ? ((totalActualCosts - estimatedCost) / estimatedCost) * 100 
      : null;

    // Timeline of costs
    const costsByMonth = costs.reduce((acc, cost) => {
      const monthKey = new Date(cost.costDate).toISOString().slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = 0;
      }
      acc[monthKey] += Number(cost.amount);
      return acc;
    }, {} as Record<string, number>);

    return apiSuccess({
      costs,
      summary: {
        totalEntries: costs.length,
        totalAmount: totalActualCosts,
        estimatedCost,
        actualCost: totalActualCosts,
        variance,
        variancePercentage: variancePercentage?.toFixed(2),
        isOverBudget: variance !== null && variance > 0,
        storedActualCost: Number(externalJob.actualCost || 0),
      },
      breakdown: {
        byType: breakdownByType,
        byTypeSummary: Object.entries(breakdownByType).map(([type, data]) => ({
          type,
          total: data.total,
          count: data.count,
          percentage: totalActualCosts > 0 
            ? ((data.total / totalActualCosts) * 100).toFixed(1)
            : '0',
        })),
      },
      timeline: {
        byMonth: Object.entries(costsByMonth)
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (error) {
    console.error('Get costs error:', error);
    return apiError('Failed to fetch costs', 500);
  }
}

// POST /api/external-jobs/[id]/costs - Add cost entry
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = createCostSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Verify external job exists
    const externalJob = await db.externalJob.findUnique({
      where: { id },
    });

    if (!externalJob || !externalJob.isActive) {
      return apiNotFound('External job');
    }

    // Only allow adding costs for APPROVED, IN_PROGRESS, or COMPLETED status
    if (!['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED'].includes(externalJob.status)) {
      return apiError(
        'Cannot add costs to job in current status',
        400
      );
    }

    // Create cost entry and update job's actual cost
    const cost = await db.$transaction(async (tx) => {
      // Create the cost entry
      const newCost = await tx.extJobCost.create({
        data: {
          externalJobId: id,
          costType: data.costType,
          description: data.description,
          amount: data.amount,
          invoiceRef: data.invoiceRef,
          costDate: data.costDate ? new Date(data.costDate) : new Date(),
          notes: data.notes,
        },
      });

      // Calculate new total actual cost
      const allCosts = await tx.extJobCost.findMany({
        where: { externalJobId: id },
        select: { amount: true },
      });

      const totalActualCost = allCosts.reduce((sum, c) => sum + Number(c.amount), 0);

      // Update job's actual cost
      await tx.externalJob.update({
        where: { id },
        data: {
          actualCost: totalActualCost,
          updatedAt: new Date(),
        },
      });

      return newCost;
    });

    // Get updated totals
    const allCosts = await db.extJobCost.findMany({
      where: { externalJobId: id },
    });
    const totalActualCost = allCosts.reduce((sum, c) => sum + Number(c.amount), 0);
    const estimatedCost = Number(externalJob.estimatedCost || 0);
    const variance = estimatedCost > 0 ? totalActualCost - estimatedCost : null;

    return apiSuccess(
      {
        cost,
        jobCostSummary: {
          totalActualCost,
          estimatedCost,
          variance,
          isOverBudget: variance !== null && variance > 0,
        },
      },
      'Cost entry added successfully',
      201
    );
  } catch (error) {
    console.error('Create cost error:', error);
    return apiError('Failed to create cost entry', 500);
  }
}
