import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

const approveSchema = z.object({
  approvedBy: z.string().min(1, 'Approver is required'),
  comments: z.string().optional(),
  action: z.enum(['approve', 'reject']).default('approve'),
  rejectionReason: z.string().optional(),
});

// POST - Approve or reject adjustment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = approveSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { approvedBy, comments, action, rejectionReason } = result.data;

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      include: {
        lines: true,
        store: true,
      }
    });

    if (!adjustment) {
      return apiNotFound('Adjustment');
    }

    if (!['DRAFT', 'PENDING_APPROVAL'].includes(adjustment.status)) {
      return apiError('Adjustment cannot be approved in current status', 400);
    }

    // Check approval threshold based on total value
    const APPROVAL_THRESHOLDS = [
      { max: 100, levels: 1 },      // Up to $100 - 1 level
      { max: 1000, levels: 1 },     // Up to $1000 - 1 level  
      { max: 5000, levels: 2 },     // Up to $5000 - 2 levels
      { max: Infinity, levels: 3 }, // Above $5000 - 3 levels
    ];

    const totalValue = Math.abs(adjustment.totalValue.toNumber());
    const threshold = APPROVAL_THRESHOLDS.find(t => totalValue <= t.max);
    const requiredLevels = threshold?.levels || 1;

    if (action === 'reject') {
      const updated = await db.stockAdjustment.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || comments,
          approvedBy,
          approvedAt: new Date(),
        }
      });

      return apiSuccess({
        ...updated,
        totalValue: updated.totalValue.toNumber(),
      }, 'Adjustment rejected');
    }

    // Approve
    const updated = await db.stockAdjustment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        notes: comments ? `${adjustment.notes || ''}\nApproval: ${comments}` : adjustment.notes,
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

    // Create audit log
    await db.auditLog.create({
      data: {
        entityType: 'StockAdjustment',
        entityId: id,
        action: 'APPROVED',
        newValue: JSON.stringify({
          adjustmentNumber: adjustment.adjustmentNumber,
          totalValue: adjustment.totalValue.toNumber(),
          approvedBy,
          approvedAt: new Date(),
        }),
        actorId: approvedBy,
      }
    });

    return apiSuccess({
      ...updated,
      totalValue: updated.totalValue.toNumber(),
      lines: updated.lines.map(l => ({
        ...l,
        adjustmentQty: l.adjustmentQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalValue: l.totalValue.toNumber(),
      })),
      approvalInfo: {
        approvedBy,
        approvedAt: new Date(),
        requiredLevels,
        currentLevel: 1,
      }
    }, 'Adjustment approved successfully');
  } catch (error) {
    console.error('Approve adjustment error:', error);
    return apiError('Failed to approve adjustment', 500);
  }
}
