/**
 * ============================================
 * LPA CHANGE HISTORY API
 * ============================================
 * API endpoint for retrieving LPA change history for a workshop.
 * 
 * GET /api/lpa/[workshopId]/history - Get change history for a workshop
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  parsePagination,
  getSkip,
  getCurrentUser,
  hasAnyPrivilege,
} from '@/lib/api-utils';

// ============================================
// GET - Get LPA change history
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

    const canView = hasAnyPrivilege(user, ['SYS_LPA_OVERRIDE', 'LP_APPROVE_L1', 'LP_APPROVE_L2', 'LP_APPROVE_L3', 'USER_MANAGE', 'AUDIT_VIEW']);
    if (!canView) {
      return apiForbidden('You do not have permission to view LPA history');
    }

    const { workshopId } = await params;

    // Verify workshop exists
    const workshop = await db.workshopPurchaseAuthority.findUnique({
      where: { workshopId },
      select: { workshopId: true, workshopName: true },
    });

    if (!workshop) {
      return apiNotFound('Workshop LPA configuration');
    }

    const { page, limit, sortBy, sortOrder } = parsePagination(new URL(request.url));
    const skip = getSkip(page, limit);

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get total count and history in parallel
    const [total, history] = await Promise.all([
      db.lpaChangeHistory.count({ where: { workshopId } }),
      db.lpaChangeHistory.findMany({
        where: { workshopId },
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    // Get user details for each history entry
    const userIds = [...new Set(history.map(h => h.changedBy))];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map((users as any[]).map(u => [u.id, u]));

    // Enrich history with user details
    const enrichedHistory = history.map(h => {
      const changedByUser = userMap.get(h.changedBy);
      return {
        id: h.id,
        workshopId: h.workshopId,
        previousLimit: Number(h.previousLimit),
        newLimit: Number(h.newLimit),
        limitChange: Number(h.newLimit) - Number(h.previousLimit),
        changeReason: h.changeReason,
        changedBy: h.changedBy,
        changedByName: changedByUser?.name || 'Unknown',
        changedByEmail: changedByUser?.email || 'Unknown',
        effectiveFrom: h.effectiveFrom,
        createdAt: h.createdAt,
      };
    });

    // Calculate statistics
    const stats = {
      totalChanges: total,
      totalIncrease: enrichedHistory
        .filter(h => h.limitChange > 0)
        .reduce((sum, h) => sum + h.limitChange, 0),
      totalDecrease: enrichedHistory
        .filter(h => h.limitChange < 0)
        .reduce((sum, h) => sum + Math.abs(h.limitChange), 0),
      averageLimit: enrichedHistory.length > 0
        ? enrichedHistory.reduce((sum, h) => sum + h.newLimit, 0) / enrichedHistory.length
        : 0,
    };

    return apiSuccess({
      workshop,
      history: enrichedHistory,
      statistics: stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching LPA change history:', error);
    return apiError('Failed to fetch LPA change history', 500);
  }
}
