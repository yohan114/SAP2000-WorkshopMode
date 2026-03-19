/**
 * ============================================
 * LPA MANAGEMENT API - SINGLE WORKSHOP
 * ============================================
 * API endpoint for managing a specific workshop's LPA configuration.
 * 
 * GET    /api/lpa/[workshopId] - Get workshop LPA details with current usage
 * PUT    /api/lpa/[workshopId] - Update LPA limits (with audit log)
 * DELETE /api/lpa/[workshopId] - Deactivate workshop LPA
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  getCurrentUser,
  hasAnyPrivilege,
} from '@/lib/api-utils';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const UpdateLpaSchema = z.object({
  workshopName: z.string().min(1, 'Workshop name is required').optional(),
  lpaLimit: z.number().positive('LPA limit must be positive').optional(),
  emergencyLpaLimit: z.number().positive('Emergency LPA limit must be positive').optional(),
  monthlyCap: z.number().positive('Monthly cap must be positive').optional(),
  changeReason: z.string().min(1, 'Change reason is required for updates'),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getWorkshopLpa(workshopId: string) {
  return db.workshopPurchaseAuthority.findUnique({
    where: { workshopId },
  });
}

async function calculateMonthlyUsage(workshopId: string) {
  // Get the start and end of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Calculate total value of approved purchase orders for this workshop in current month
  const approvedPOs = await db.purchaseOrder.findMany({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: {
        in: ['APPROVED', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICED'],
      },
    },
    select: {
      totalValue: true,
    },
  });

  const totalSpend = approvedPOs.reduce((sum, po) => sum + Number(po.totalValue), 0);
  return totalSpend;
}

// ============================================
// GET - Get workshop LPA details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Authentication required');
    }

    const canView = hasAnyPrivilege(user, ['SYS_LPA_OVERRIDE', 'LP_APPROVE_L1', 'LP_APPROVE_L2', 'LP_APPROVE_L3', 'USER_MANAGE']);
    if (!canView) {
      return apiForbidden('You do not have permission to view LPA configurations');
    }

    const { workshopId } = await params;
    const config = await getWorkshopLpa(workshopId);

    if (!config) {
      return apiNotFound('Workshop LPA configuration');
    }

    // Calculate current month usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const isCurrentMonth = config.currentMonth === currentMonth;
    
    // If the stored month is different, recalculate
    let monthlyUsage = Number(config.currentMonthSpend);
    if (!isCurrentMonth) {
      monthlyUsage = await calculateMonthlyUsage(workshopId);
    }

    const monthlyCap = Number(config.monthlyCap);
    const usagePercent = monthlyCap > 0 ? (monthlyUsage / monthlyCap) * 100 : 0;

    // Get recent change history
    const recentHistory = await db.lpaChangeHistory.findMany({
      where: { workshopId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return apiSuccess({
      ...config,
      lpaLimit: Number(config.lpaLimit),
      emergencyLpaLimit: Number(config.emergencyLpaLimit),
      monthlyCap: Number(config.monthlyCap),
      currentMonthSpend: monthlyUsage,
      usagePercent: usagePercent.toFixed(2),
      remainingBudget: monthlyCap - monthlyUsage,
      isCurrentMonth,
      recentHistory: recentHistory.map(h => ({
        ...h,
        previousLimit: Number(h.previousLimit),
        newLimit: Number(h.newLimit),
      })),
    });
  } catch (error) {
    console.error('Error fetching workshop LPA:', error);
    return apiError('Failed to fetch workshop LPA configuration', 500);
  }
}

// ============================================
// PUT - Update LPA limits
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Authentication required');
    }

    // Only SYS_LPA_OVERRIDE can update LPA limits
    const canUpdate = hasAnyPrivilege(user, ['SYS_LPA_OVERRIDE', 'SYSTEM_CONFIG']);
    if (!canUpdate) {
      return apiForbidden('You do not have permission to update LPA configurations');
    }

    const { workshopId } = await params;
    const config = await getWorkshopLpa(workshopId);

    if (!config) {
      return apiNotFound('Workshop LPA configuration');
    }

    const body = await request.json();
    const validation = UpdateLpaSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const data = validation.data;

    // Validate emergency limit is higher than standard if both are provided
    const newLpaLimit = data.lpaLimit ?? Number(config.lpaLimit);
    const newEmergencyLimit = data.emergencyLpaLimit ?? Number(config.emergencyLpaLimit);

    if (newEmergencyLimit < newLpaLimit) {
      return apiError('Emergency LPA limit should be higher than standard LPA limit', 400);
    }

    // Record the change in history if LPA limit changed
    if (data.lpaLimit !== undefined && data.lpaLimit !== Number(config.lpaLimit)) {
      await db.lpaChangeHistory.create({
        data: {
          workshopId,
          previousLimit: config.lpaLimit,
          newLimit: data.lpaLimit,
          changeReason: data.changeReason,
          changedBy: user.id,
          effectiveFrom: new Date(),
        },
      });
    }

    // Update the configuration
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.workshopName) updateData.workshopName = data.workshopName;
    if (data.lpaLimit !== undefined) updateData.lpaLimit = data.lpaLimit;
    if (data.emergencyLpaLimit !== undefined) updateData.emergencyLpaLimit = data.emergencyLpaLimit;
    if (data.monthlyCap !== undefined) updateData.monthlyCap = data.monthlyCap;

    const updated = await db.workshopPurchaseAuthority.update({
      where: { workshopId },
      data: updateData,
    });

    return apiSuccess({
      ...updated,
      lpaLimit: Number(updated.lpaLimit),
      emergencyLpaLimit: Number(updated.emergencyLpaLimit),
      monthlyCap: Number(updated.monthlyCap),
      currentMonthSpend: Number(updated.currentMonthSpend),
    }, 'LPA configuration updated successfully');
  } catch (error) {
    console.error('Error updating workshop LPA:', error);
    return apiError('Failed to update workshop LPA configuration', 500);
  }
}

// ============================================
// DELETE - Deactivate workshop LPA
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Authentication required');
    }

    // Only SYS_LPA_OVERRIDE can deactivate LPA
    const canDelete = hasAnyPrivilege(user, ['SYS_LPA_OVERRIDE', 'SYSTEM_CONFIG']);
    if (!canDelete) {
      return apiForbidden('You do not have permission to deactivate LPA configurations');
    }

    const { workshopId } = await params;
    const config = await getWorkshopLpa(workshopId);

    if (!config) {
      return apiNotFound('Workshop LPA configuration');
    }

    // Soft delete by setting isActive to false
    await db.workshopPurchaseAuthority.update({
      where: { workshopId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Record the deactivation in history
    await db.lpaChangeHistory.create({
      data: {
        workshopId,
        previousLimit: config.lpaLimit,
        newLimit: 0,
        changeReason: 'LPA configuration deactivated',
        changedBy: user.id,
        effectiveFrom: new Date(),
      },
    });

    return apiSuccess({ workshopId }, 'LPA configuration deactivated successfully');
  } catch (error) {
    console.error('Error deactivating workshop LPA:', error);
    return apiError('Failed to deactivate workshop LPA configuration', 500);
  }
}
