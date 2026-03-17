/**
 * ============================================
 * LPA (LIMITED PURCHASE AUTHORITY) UTILITIES
 * ============================================
 * Utility functions for managing LPA limits, checking approvals,
 * and tracking monthly spend for workshop purchase authorities.
 */

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface LpaCheckResult {
  allowed: boolean;
  reason: string;
  currentLimit: number;
  requestedAmount: number;
  remainingMonthly: number;
  isEmergency: boolean;
}

export interface LpaBalance {
  workshopId: string;
  workshopName: string;
  lpaLimit: number;
  emergencyLpaLimit: number;
  monthlyCap: number;
  currentMonthSpend: number;
  remainingMonthly: number;
  usagePercent: number;
  currentMonth: string;
}

export interface UserLpaLevel {
  userId: string;
  userName: string;
  level: number;
  maxAmount: number;
  emergencyMaxAmount: number;
}

// ============================================
// LPA LIMIT LEVELS BY ROLE
// ============================================

/**
 * Get LPA limit based on user's role/privilege level
 * Returns the maximum amount the user can approve
 */
export async function getUserLpaLevel(userId: string): Promise<UserLpaLevel | null> {
  // Get user with their roles and privileges
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      roles: {
        where: { isActive: true },
        select: {
          role: {
            select: {
              code: true,
              level: true,
              privileges: {
                where: { isGranted: true },
                select: {
                  privilege: {
                    select: { code: true },
                  },
                  maxAmount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Determine LPA level based on privileges
  let level = 0;
  let maxAmount = 0;
  let emergencyMaxAmount = 0;

  const privilegeCodes = user.roles.flatMap(ur =>
    ur.role.privileges.map(p => p.privilege.code)
  );

  const maxAmounts = user.roles.flatMap(ur =>
    ur.role.privileges
      .filter(p => p.maxAmount !== null)
      .map(p => Number(p.maxAmount))
  );

  // Check for LPA approval levels
  if (privilegeCodes.includes('LP_APPROVE_L3')) {
    level = 3;
    maxAmount = 250000; // Workshop Manager level
    emergencyMaxAmount = 375000;
  } else if (privilegeCodes.includes('LP_APPROVE_L2')) {
    level = 2;
    maxAmount = 100000; // Procurement Officer level
    emergencyMaxAmount = 150000;
  } else if (privilegeCodes.includes('LP_APPROVE_L1')) {
    level = 1;
    maxAmount = 25000; // Workshop Supervisor level
    emergencyMaxAmount = 37500;
  }

  // Override with privilege max amounts if set
  if (maxAmounts.length > 0) {
    maxAmount = Math.max(...maxAmounts);
    emergencyMaxAmount = maxAmount * 1.5;
  }

  // SYS_LPA_OVERRIDE has unlimited
  if (privilegeCodes.includes('SYS_LPA_OVERRIDE')) {
    level = 99;
    maxAmount = Number.MAX_SAFE_INTEGER;
    emergencyMaxAmount = Number.MAX_SAFE_INTEGER;
  }

  return {
    userId: user.id,
    userName: user.name || 'Unknown',
    level,
    maxAmount,
    emergencyMaxAmount,
  };
}

// ============================================
// LPA CHECK FUNCTIONS
// ============================================

/**
 * Check if a purchase amount is within LPA limits for a workshop
 */
export async function checkLpaLimit(
  workshopId: string,
  userId: string,
  amount: number,
  isEmergency: boolean = false
): Promise<LpaCheckResult> {
  // Get workshop LPA configuration
  const workshopLpa = await db.workshopPurchaseAuthority.findUnique({
    where: { workshopId, isActive: true },
  });

  if (!workshopLpa) {
    return {
      allowed: false,
      reason: 'Workshop LPA configuration not found',
      currentLimit: 0,
      requestedAmount: amount,
      remainingMonthly: 0,
      isEmergency,
    };
  }

  // Get user's LPA level
  const userLpa = await getUserLpaLevel(userId);
  if (!userLpa) {
    return {
      allowed: false,
      reason: 'User not found',
      currentLimit: 0,
      requestedAmount: amount,
      remainingMonthly: 0,
      isEmergency,
    };
  }

  // Determine the applicable limit
  const applicableLimit = isEmergency
    ? Math.min(userLpa.emergencyMaxAmount, Number(workshopLpa.emergencyLpaLimit))
    : Math.min(userLpa.maxAmount, Number(workshopLpa.lpaLimit));

  // Check current month spend
  const currentMonth = new Date().toISOString().slice(0, 7);
  let currentMonthSpend = Number(workshopLpa.currentMonthSpend);

  // Reset spend if new month
  if (workshopLpa.currentMonth !== currentMonth) {
    currentMonthSpend = 0;
  }

  const remainingMonthly = Number(workshopLpa.monthlyCap) - currentMonthSpend;

  // Check 1: User's LPA limit
  if (amount > applicableLimit) {
    return {
      allowed: false,
      reason: `Amount exceeds ${isEmergency ? 'emergency' : 'standard'} LPA limit of ${applicableLimit.toLocaleString()}`,
      currentLimit: applicableLimit,
      requestedAmount: amount,
      remainingMonthly,
      isEmergency,
    };
  }

  // Check 2: Monthly cap
  if (amount > remainingMonthly) {
    return {
      allowed: false,
      reason: `Insufficient monthly budget. Remaining: ${remainingMonthly.toLocaleString()}`,
      currentLimit: applicableLimit,
      requestedAmount: amount,
      remainingMonthly,
      isEmergency,
    };
  }

  return {
    allowed: true,
    reason: 'Amount within LPA limits',
    currentLimit: applicableLimit,
    requestedAmount: amount,
    remainingMonthly,
    isEmergency,
  };
}

/**
 * Record a spend against the workshop's monthly LPA cap
 */
export async function recordLpaSpend(
  workshopId: string,
  amount: number
): Promise<{ success: boolean; newSpend: number; remaining: number }> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Get current config
  const config = await db.workshopPurchaseAuthority.findUnique({
    where: { workshopId },
  });

  if (!config) {
    throw new Error('Workshop LPA configuration not found');
  }

  // Check if we need to reset for new month
  let currentSpend = Number(config.currentMonthSpend);
  if (config.currentMonth !== currentMonth) {
    currentSpend = 0;
  }

  const newSpend = currentSpend + amount;
  const remaining = Number(config.monthlyCap) - newSpend;

  // Update the spend
  await db.workshopPurchaseAuthority.update({
    where: { workshopId },
    data: {
      currentMonthSpend: newSpend,
      currentMonth,
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    newSpend,
    remaining,
  };
}

/**
 * Get remaining LPA balance for the month
 */
export async function getLpaBalance(workshopId: string): Promise<LpaBalance | null> {
  const config = await db.workshopPurchaseAuthority.findUnique({
    where: { workshopId, isActive: true },
  });

  if (!config) return null;

  const currentMonth = new Date().toISOString().slice(0, 7);
  let currentSpend = Number(config.currentMonthSpend);

  // Reset spend if new month
  if (config.currentMonth !== currentMonth) {
    currentSpend = 0;
    // Update the database
    await db.workshopPurchaseAuthority.update({
      where: { workshopId },
      data: {
        currentMonthSpend: 0,
        currentMonth,
        updatedAt: new Date(),
      },
    });
  }

  const monthlyCap = Number(config.monthlyCap);
  const remaining = monthlyCap - currentSpend;
  const usagePercent = monthlyCap > 0 ? (currentSpend / monthlyCap) * 100 : 0;

  return {
    workshopId: config.workshopId,
    workshopName: config.workshopName,
    lpaLimit: Number(config.lpaLimit),
    emergencyLpaLimit: Number(config.emergencyLpaLimit),
    monthlyCap,
    currentMonthSpend: currentSpend,
    remainingMonthly: remaining,
    usagePercent,
    currentMonth,
  };
}

/**
 * Check if a user can approve a purchase at a given amount level
 */
export async function canApproveLocally(
  userId: string,
  amount: number,
  isEmergency: boolean = false
): Promise<{ canApprove: boolean; reason: string }> {
  const userLpa = await getUserLpaLevel(userId);

  if (!userLpa) {
    return { canApprove: false, reason: 'User not found' };
  }

  const applicableLimit = isEmergency ? userLpa.emergencyMaxAmount : userLpa.maxAmount;

  if (amount <= applicableLimit) {
    return { canApprove: true, reason: 'Within approval limit' };
  }

  return {
    canApprove: false,
    reason: `Amount ${amount.toLocaleString()} exceeds ${isEmergency ? 'emergency' : 'standard'} approval limit of ${applicableLimit.toLocaleString()}`,
  };
}

// ============================================
// CHANNEL DECISION HELPERS
// ============================================

/**
 * Determine procurement channel based on amount and LPA limits
 * Returns 'LOCAL' or 'HO' based on the workshop's LPA configuration
 */
export async function determineProcurementChannel(
  workshopId: string,
  amount: number
): Promise<{ channel: 'LOCAL' | 'HO'; reason: string }> {
  const config = await db.workshopPurchaseAuthority.findUnique({
    where: { workshopId, isActive: true },
  });

  if (!config) {
    return { channel: 'HO', reason: 'Workshop LPA configuration not found - defaulting to HO' };
  }

  const lpaLimit = Number(config.lpaLimit);
  const emergencyLimit = Number(config.emergencyLpaLimit);

  if (amount <= lpaLimit) {
    return { channel: 'LOCAL', reason: 'Within standard LPA limit' };
  }

  if (amount <= emergencyLimit) {
    return { channel: 'LOCAL', reason: 'Within emergency LPA limit - requires emergency justification' };
  }

  return { channel: 'HO', reason: `Amount exceeds LPA limit of ${lpaLimit.toLocaleString()}` };
}

/**
 * Check if user can override the procurement channel
 */
export async function canOverrideChannel(userId: string): Promise<boolean> {
  const userLpa = await getUserLpaLevel(userId);

  if (!userLpa) return false;

  // Only users with SYS_LPA_OVERRIDE or LP_CHANNEL_OVERRIDE can override
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        where: { isActive: true },
        select: {
          role: {
            select: {
              privileges: {
                where: {
                  isGranted: true,
                  privilege: {
                    code: { in: ['SYS_LPA_OVERRIDE', 'LP_CHANNEL_OVERRIDE'] },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return false;

  return user.roles.some(ur =>
    ur.role.privileges.length > 0
  );
}

// ============================================
// SPEND ANALYTICS
// ============================================

/**
 * Get spend analytics for a workshop
 */
export async function getWorkshopSpendAnalytics(workshopId: string, months: number = 6) {
  // This would typically be calculated from PO data
  // For now, we'll return the current LPA status
  const balance = await getLpaBalance(workshopId);

  if (!balance) {
    return null;
  }

  return {
    current: balance,
    utilizationStatus: balance.usagePercent >= 90 ? 'CRITICAL' :
                       balance.usagePercent >= 75 ? 'WARNING' : 'NORMAL',
    recommendations: generateRecommendations(balance),
  };
}

function generateRecommendations(balance: LpaBalance): string[] {
  const recommendations: string[] = [];

  if (balance.usagePercent >= 90) {
    recommendations.push('Monthly budget nearly exhausted. Consider postponing non-critical purchases.');
  }

  if (balance.usagePercent >= 75) {
    recommendations.push('Approaching monthly budget limit. Review pending purchase requests carefully.');
  }

  if (balance.remainingMonthly > balance.monthlyCap * 0.5) {
    recommendations.push('Good budget utilization. Room for additional purchases this month.');
  }

  if (balance.lpaLimit < 50000) {
    recommendations.push('Consider requesting LPA limit increase for larger local purchases.');
  }

  return recommendations;
}
