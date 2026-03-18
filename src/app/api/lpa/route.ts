/**
 * ============================================
 * LPA MANAGEMENT API - LIST / CREATE
 * ============================================
 * API endpoint for managing Workshop Purchase Authority (LPA) configurations.
 * 
 * GET  /api/lpa - List all workshop LPA configurations
 * POST /api/lpa - Create new workshop LPA config (admin only)
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
  parsePagination,
  getSkip,
  getCurrentUser,
  hasAnyPrivilege,
} from '@/lib/api-utils';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateLpaSchema = z.object({
  workshopId: z.string().min(1, 'Workshop ID is required'),
  workshopName: z.string().min(1, 'Workshop name is required'),
  lpaLimit: z.number().positive('LPA limit must be positive'),
  emergencyLpaLimit: z.number().positive('Emergency LPA limit must be positive'),
  monthlyCap: z.number().positive('Monthly cap must be positive'),
});

// ============================================
// GET - List all LPA configurations
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Authentication required');
    }

    // Check if user has permission to view LPA configurations
    const canView = hasAnyPrivilege(user, ['SYS_LPA_OVERRIDE', 'LP_APPROVE_L1', 'LP_APPROVE_L2', 'LP_APPROVE_L3', 'USER_MANAGE']);
    if (!canView) {
      return apiForbidden('You do not have permission to view LPA configurations');
    }

    const { page, limit, search, sortBy, sortOrder } = parsePagination(new URL(request.url));
    const skip = getSkip(page, limit);

    // Build where clause for search
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { workshopId: { contains: search, mode: 'insensitive' } },
        { workshopName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.workshopName = 'asc';
    }

    // Get total count and data in parallel
    const [total, configs] = await Promise.all([
      db.workshopPurchaseAuthority.count({ where }),
      db.workshopPurchaseAuthority.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    // Get current month for usage calculation
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Calculate usage percentage for each config
    const configsWithUsage = configs.map(config => {
      const currentMonthMatch = config.currentMonth === currentMonth;
      const monthlySpend = Number(config.currentMonthSpend);
      const monthlyCap = Number(config.monthlyCap);
      const usagePercent = monthlyCap > 0 ? (monthlySpend / monthlyCap) * 100 : 0;

      return {
        ...config,
        lpaLimit: Number(config.lpaLimit),
        emergencyLpaLimit: Number(config.emergencyLpaLimit),
        monthlyCap: Number(config.monthlyCap),
        currentMonthSpend: monthlySpend,
        usagePercent: usagePercent.toFixed(2),
        isCurrentMonth: currentMonthMatch,
        remainingBudget: monthlyCap - monthlySpend,
      };
    });

    return apiSuccess({
      configurations: configsWithUsage,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalWorkshops: total,
        currentMonth,
        totalMonthlySpend: configs.reduce((sum, c) => sum + Number(c.currentMonthSpend), 0),
        totalMonthlyCap: configs.reduce((sum, c) => sum + Number(c.monthlyCap), 0),
      },
    });
  } catch (error) {
    console.error('Error fetching LPA configurations:', error);
    return apiError('Failed to fetch LPA configurations', 500);
  }
}

// ============================================
// POST - Create new LPA configuration
// ============================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Authentication required');
    }

    // Only admin or SYS_LPA_OVERRIDE can create LPA configurations
    const canCreate = hasAnyPrivilege(user, ['SYS_LPA_OVERRIDE', 'USER_MANAGE', 'SYSTEM_CONFIG']);
    if (!canCreate) {
      return apiForbidden('You do not have permission to create LPA configurations');
    }

    const body = await request.json();
    const validation = CreateLpaSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const data = validation.data;

    // Check if workshop ID already exists
    const existing = await db.workshopPurchaseAuthority.findUnique({
      where: { workshopId: data.workshopId },
    });

    if (existing) {
      return apiError('Workshop ID already exists. Use PUT to update existing configuration.', 400);
    }

    // Validate emergency limit is higher than standard
    if (data.emergencyLpaLimit < data.lpaLimit) {
      return apiError('Emergency LPA limit should be higher than standard LPA limit', 400);
    }

    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Create the LPA configuration
    const config = await db.workshopPurchaseAuthority.create({
      data: {
        workshopId: data.workshopId,
        workshopName: data.workshopName,
        lpaLimit: data.lpaLimit,
        emergencyLpaLimit: data.emergencyLpaLimit,
        monthlyCap: data.monthlyCap,
        currentMonthSpend: 0,
        currentMonth,
        isActive: true,
      },
    });

    // Record the change in history
    await db.lpaChangeHistory.create({
      data: {
        workshopId: data.workshopId,
        previousLimit: 0,
        newLimit: data.lpaLimit,
        changeReason: 'Initial LPA configuration created',
        changedBy: user.id,
        effectiveFrom: new Date(),
      },
    });

    return apiSuccess({
      ...config,
      lpaLimit: Number(config.lpaLimit),
      emergencyLpaLimit: Number(config.emergencyLpaLimit),
      monthlyCap: Number(config.monthlyCap),
      currentMonthSpend: Number(config.currentMonthSpend),
    }, 'LPA configuration created successfully', 201);
  } catch (error) {
    console.error('Error creating LPA configuration:', error);
    return apiError('Failed to create LPA configuration', 500);
  }
}
