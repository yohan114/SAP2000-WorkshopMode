import { db } from '@/lib/db';

// ============================================
// KPI ENGINE INTERFACES
// ============================================

export interface KPIResult {
  id: string;
  name: string;
  category: 'OPERATIONAL' | 'RELIABILITY' | 'COST' | 'INVENTORY';
  currentValue: number;
  previousValue: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercentage: number;
  target: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  unit: string;
  description: string;
}

export interface KPIPrediction {
  kpiId: string;
  currentValue: number;
  predictedValue: number;
  predictionDate: Date;
  confidence: number; // 0-100
  method: 'LINEAR' | 'MOVING_AVERAGE' | 'EXPONENTIAL_SMOOTHING';
}

export interface KPIThreshold {
  kpiId: string;
  warningThreshold: number;
  criticalThreshold: number;
  comparison: 'GREATER_THAN' | 'LESS_THAN';
}

export interface HistoricalValue {
  date: Date;
  value: number;
}

// ============================================
// OPERATIONAL KPIs
// ============================================

/**
 * Calculate Job Card Completion Rate
 * Formula: (Completed / Total) × 100
 */
export async function calculateJobCardCompletionRate(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const [completed, total] = await Promise.all([
    db.jobCard.count({
      where: {
        status: { in: ['COMPLETED', 'CLOSED'] },
        actualEnd: { gte: periodStart, lte: periodEnd },
      },
    }),
    db.jobCard.count({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  const current = total > 0 ? (completed / total) * 100 : 0;
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const [prevCompleted, prevTotal] = await Promise.all([
    db.jobCard.count({
      where: {
        status: { in: ['COMPLETED', 'CLOSED'] },
        actualEnd: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
    db.jobCard.count({
      where: {
        createdAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
  ]);

  const previous = prevTotal > 0 ? (prevCompleted / prevTotal) * 100 : 0;

  return createKPIResult({
    id: 'JC_COMPLETION_RATE',
    name: 'Job Card Completion Rate',
    category: 'OPERATIONAL',
    current,
    previous,
    target: 95,
    unit: '%',
    description: 'Percentage of job cards completed within the period',
  });
}

/**
 * Calculate Average Repair Time (MTTR)
 * Formula: Hours per job
 */
export async function calculateMTTR(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualStart: { not: null },
      AND: [
        { actualEnd: { not: null } },
        { actualEnd: { gte: periodStart, lte: periodEnd } },
      ],
    },
    select: { actualStart: true, actualEnd: true },
  });

  let totalHours = 0;
  jobCards.forEach((jc) => {
    if (jc.actualStart && jc.actualEnd) {
      totalHours +=
        (jc.actualEnd.getTime() - jc.actualStart.getTime()) / (1000 * 60 * 60);
    }
  });

  const current = jobCards.length > 0 ? totalHours / jobCards.length : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevJobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualStart: { not: null },
      AND: [
        { actualEnd: { not: null } },
        { actualEnd: { gte: previousPeriodStart, lt: periodStart } },
      ],
    },
    select: { actualStart: true, actualEnd: true },
  });

  let prevTotalHours = 0;
  prevJobCards.forEach((jc) => {
    if (jc.actualStart && jc.actualEnd) {
      prevTotalHours +=
        (jc.actualEnd.getTime() - jc.actualStart.getTime()) / (1000 * 60 * 60);
    }
  });

  const previous = prevJobCards.length > 0 ? prevTotalHours / prevJobCards.length : 0;

  return createKPIResult({
    id: 'MTTR',
    name: 'Average Repair Time (MTTR)',
    category: 'OPERATIONAL',
    current,
    previous,
    target: 8, // Target: 8 hours average
    unit: 'hours',
    description: 'Mean time to repair - average hours per job card',
    inverseStatus: true, // Lower is better
  });
}

/**
 * Calculate First-Time Fix Rate
 * Formula: (No Reopen / Total Completed) × 100
 */
export async function calculateFirstTimeFixRate(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const completedJobs = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualEnd: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true, reopenedAt: true },
  });

  const totalCompleted = completedJobs.length;
  const reopenedCount = completedJobs.filter((jc) => jc.reopenedAt).length;
  const current = totalCompleted > 0 ? ((totalCompleted - reopenedCount) / totalCompleted) * 100 : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevCompletedJobs = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualEnd: { gte: previousPeriodStart, lt: periodStart },
    },
    select: { id: true, reopenedAt: true },
  });

  const prevTotal = prevCompletedJobs.length;
  const prevReopened = prevCompletedJobs.filter((jc) => jc.reopenedAt).length;
  const previous = prevTotal > 0 ? ((prevTotal - prevReopened) / prevTotal) * 100 : 0;

  return createKPIResult({
    id: 'FIRST_TIME_FIX_RATE',
    name: 'First-Time Fix Rate',
    category: 'OPERATIONAL',
    current,
    previous,
    target: 90,
    unit: '%',
    description: 'Percentage of jobs fixed correctly the first time without reopen',
  });
}

/**
 * Calculate SLA Compliance Rate
 * Formula: (On Time / Total) × 100
 */
export async function calculateSLAComplianceRate(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const [metSLA, totalSLA] = await Promise.all([
    db.slaTracking.count({
      where: {
        status: 'MET',
        startedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    db.slaTracking.count({
      where: {
        startedAt: { gte: periodStart, lte: periodEnd },
        status: { in: ['MET', 'BREACH'] },
      },
    }),
  ]);

  const current = totalSLA > 0 ? (metSLA / totalSLA) * 100 : 100;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const [prevMet, prevTotal] = await Promise.all([
    db.slaTracking.count({
      where: {
        status: 'MET',
        startedAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
    db.slaTracking.count({
      where: {
        startedAt: { gte: previousPeriodStart, lt: periodStart },
        status: { in: ['MET', 'BREACH'] },
      },
    }),
  ]);

  const previous = prevTotal > 0 ? (prevMet / prevTotal) * 100 : 100;

  return createKPIResult({
    id: 'SLA_COMPLIANCE_RATE',
    name: 'SLA Compliance Rate',
    category: 'OPERATIONAL',
    current,
    previous,
    target: 95,
    unit: '%',
    description: 'Percentage of job cards meeting SLA targets',
  });
}

/**
 * Calculate Work Order Backlog
 * Open job cards count
 */
export async function calculateWorkOrderBacklog(): Promise<KPIResult> {
  const current = await db.jobCard.count({
    where: {
      status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
      isActive: true,
    },
  });

  // Get previous month's backlog (approximate from snapshots)
  const previousSnapshot = await db.kpiSnapshot.findFirst({
    where: { kpiCode: 'WO_BACKLOG' },
    orderBy: { snapshotDate: 'desc' },
  });

  const previous = previousSnapshot ? previousSnapshot.value : current;

  return createKPIResult({
    id: 'WO_BACKLOG',
    name: 'Work Order Backlog',
    category: 'OPERATIONAL',
    current,
    previous,
    target: 50, // Target max backlog
    unit: 'jobs',
    description: 'Number of open job cards',
    inverseStatus: true,
  });
}

// ============================================
// RELIABILITY KPIs
// ============================================

/**
 * Calculate MTBF by Asset Category
 * Formula: Hours between failures
 */
export async function calculateMTBFByCategory(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const downtimeLogs = await db.downtimeLog.findMany({
    where: {
      downtimeType: 'BREAKDOWN',
      startTime: { gte: periodStart, lte: periodEnd },
    },
    select: {
      totalMinutes: true,
      startTime: true,
      endTime: true,
      assetId: true,
    },
  });

  // Calculate period hours
  const periodHours =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);

  // Count total assets
  const totalAssets = await db.asset.count({ where: { isActive: true } });
  const totalOperatingHours = periodHours * totalAssets;

  // Calculate total downtime
  let totalDowntimeMinutes = 0;
  downtimeLogs.forEach((log) => {
    if (log.totalMinutes) {
      totalDowntimeMinutes += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff =
        new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      totalDowntimeMinutes += diff / (1000 * 60);
    }
  });

  const downtimeHours = totalDowntimeMinutes / 60;
  const failureCount = downtimeLogs.length;
  const effectiveOperatingTime = totalOperatingHours - downtimeHours;

  const current = failureCount > 0 ? effectiveOperatingTime / failureCount : periodHours;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevDowntimeLogs = await db.downtimeLog.findMany({
    where: {
      downtimeType: 'BREAKDOWN',
      startTime: { gte: previousPeriodStart, lt: periodStart },
    },
    select: {
      totalMinutes: true,
      startTime: true,
      endTime: true,
    },
  });

  let prevDowntimeMinutes = 0;
  prevDowntimeLogs.forEach((log) => {
    if (log.totalMinutes) {
      prevDowntimeMinutes += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff =
        new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      prevDowntimeMinutes += diff / (1000 * 60);
    }
  });

  const prevDowntimeHours = prevDowntimeMinutes / 60;
  const prevPeriodHours =
    (periodStart.getTime() - previousPeriodStart.getTime()) / (1000 * 60 * 60);
  const prevEffectiveOpTime = prevPeriodHours * totalAssets - prevDowntimeHours;
  const previous =
    prevDowntimeLogs.length > 0
      ? prevEffectiveOpTime / prevDowntimeLogs.length
      : prevPeriodHours;

  return createKPIResult({
    id: 'MTBF',
    name: 'Mean Time Between Failures (MTBF)',
    category: 'RELIABILITY',
    current,
    previous,
    target: 168, // Target: 1 week (168 hours)
    unit: 'hours',
    description: 'Average operating hours between failures',
  });
}

/**
 * Calculate Asset Availability Rate
 * Formula: (Available / Total) × 100
 */
export async function calculateAssetAvailabilityRate(): Promise<KPIResult> {
  const [total, operational] = await Promise.all([
    db.asset.count({ where: { isActive: true } }),
    db.asset.count({
      where: { isActive: true, status: 'OPERATIONAL' },
    }),
  ]);

  const current = total > 0 ? (operational / total) * 100 : 100;

  // Get previous from snapshot
  const previousSnapshot = await db.kpiSnapshot.findFirst({
    where: { kpiCode: 'ASSET_AVAILABILITY' },
    orderBy: { snapshotDate: 'desc' },
  });

  const previous = previousSnapshot ? previousSnapshot.value : current;

  return createKPIResult({
    id: 'ASSET_AVAILABILITY',
    name: 'Asset Availability Rate',
    category: 'RELIABILITY',
    current,
    previous,
    target: 95,
    unit: '%',
    description: 'Percentage of assets in operational status',
  });
}

/**
 * Calculate Planned vs Unplanned Ratio
 * Formula: PM / Emergency jobs
 */
export async function calculatePlannedUnplannedRatio(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const [pmJobs, emergencyJobs] = await Promise.all([
    db.jobCard.count({
      where: {
        jobType: 'PREVENTIVE',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    db.jobCard.count({
      where: {
        priority: 'EMERGENCY',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  const current = emergencyJobs > 0 ? (pmJobs / emergencyJobs) * 100 : pmJobs > 0 ? 100 : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const [prevPM, prevEmergency] = await Promise.all([
    db.jobCard.count({
      where: {
        jobType: 'PREVENTIVE',
        createdAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
    db.jobCard.count({
      where: {
        priority: 'EMERGENCY',
        createdAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
  ]);

  const previous =
    prevEmergency > 0 ? (prevPM / prevEmergency) * 100 : prevPM > 0 ? 100 : 0;

  return createKPIResult({
    id: 'PLANNED_UNPLANNED_RATIO',
    name: 'Planned vs Unplanned Ratio',
    category: 'RELIABILITY',
    current,
    previous,
    target: 80, // Target: 80% planned work
    unit: '%',
    description: 'Ratio of preventive maintenance to emergency jobs',
  });
}

/**
 * Calculate Failure Frequency
 * Formula: Failures per 1000 operating hours
 */
export async function calculateFailureFrequency(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const [failures, assetCount] = await Promise.all([
    db.downtimeLog.count({
      where: {
        downtimeType: 'BREAKDOWN',
        startTime: { gte: periodStart, lte: periodEnd },
      },
    }),
    db.asset.count({ where: { isActive: true } }),
  ]);

  const periodDays =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  const operatingHours = assetCount * periodDays * 24; // 24/7 operation

  const current = (failures / operatingHours) * 1000;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevFailures = await db.downtimeLog.count({
    where: {
      downtimeType: 'BREAKDOWN',
      startTime: { gte: previousPeriodStart, lt: periodStart },
    },
  });

  const prevPeriodDays =
    (periodStart.getTime() - previousPeriodStart.getTime()) / (1000 * 60 * 60 * 24);
  const prevOperatingHours = assetCount * prevPeriodDays * 24;
  const previous = (prevFailures / prevOperatingHours) * 1000;

  return createKPIResult({
    id: 'FAILURE_FREQUENCY',
    name: 'Failure Frequency',
    category: 'RELIABILITY',
    current,
    previous,
    target: 0.5, // Target: 0.5 failures per 1000 hours
    unit: '/1000h',
    description: 'Failures per 1000 operating hours',
    inverseStatus: true,
  });
}

// ============================================
// COST KPIs
// ============================================

/**
 * Calculate Cost per Repair
 * Formula: Average cost per job card
 */
export async function calculateCostPerRepair(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualEnd: { gte: periodStart, lte: periodEnd },
    },
    select: { actualCost: true },
  });

  const totalCost = jobCards.reduce(
    (sum, jc) => sum + Number(jc.actualCost || 0),
    0
  );
  const current = jobCards.length > 0 ? totalCost / jobCards.length : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevJobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualEnd: { gte: previousPeriodStart, lt: periodStart },
    },
    select: { actualCost: true },
  });

  const prevTotalCost = prevJobCards.reduce(
    (sum, jc) => sum + Number(jc.actualCost || 0),
    0
  );
  const previous =
    prevJobCards.length > 0 ? prevTotalCost / prevJobCards.length : 0;

  return createKPIResult({
    id: 'COST_PER_REPAIR',
    name: 'Cost per Repair',
    category: 'COST',
    current,
    previous,
    target: 500, // Target average
    unit: 'LKR',
    description: 'Average cost per job card',
    inverseStatus: true,
  });
}

/**
 * Calculate Material Cost Variance
 * Formula: (Actual - Estimated) / Estimated × 100
 */
export async function calculateMaterialCostVariance(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualEnd: { gte: periodStart, lte: periodEnd },
      estimatedCost: { not: null },
    },
    select: { actualCost: true, estimatedCost: true },
  });

  let totalVariance = 0;
  let count = 0;

  jobCards.forEach((jc) => {
    if (jc.estimatedCost && Number(jc.estimatedCost) > 0) {
      const actual = Number(jc.actualCost || 0);
      const estimated = Number(jc.estimatedCost);
      totalVariance += ((actual - estimated) / estimated) * 100;
      count++;
    }
  });

  const current = count > 0 ? totalVariance / count : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevJobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualEnd: { gte: previousPeriodStart, lt: periodStart },
      estimatedCost: { not: null },
    },
    select: { actualCost: true, estimatedCost: true },
  });

  let prevTotalVariance = 0;
  let prevCount = 0;

  prevJobCards.forEach((jc) => {
    if (jc.estimatedCost && Number(jc.estimatedCost) > 0) {
      const actual = Number(jc.actualCost || 0);
      const estimated = Number(jc.estimatedCost);
      prevTotalVariance += ((actual - estimated) / estimated) * 100;
      prevCount++;
    }
  });

  const previous = prevCount > 0 ? prevTotalVariance / prevCount : 0;

  return createKPIResult({
    id: 'MATERIAL_COST_VARIANCE',
    name: 'Material Cost Variance',
    category: 'COST',
    current,
    previous,
    target: 10, // Target: within 10% variance
    unit: '%',
    description: 'Percentage variance between estimated and actual costs',
    inverseStatus: true,
  });
}

/**
 * Calculate Labour Utilization Rate
 * Formula: (Productive Hours / Available Hours) × 100
 */
export async function calculateLabourUtilizationRate(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  const timeLogs = await db.timeLog.findMany({
    where: {
      logDate: { gte: periodStart, lte: periodEnd },
      totalMinutes: { not: null },
    },
    select: { totalMinutes: true },
  });

  const billedMinutes = timeLogs.reduce(
    (sum, log) => sum + (log.totalMinutes || 0),
    0
  );
  const billedHours = billedMinutes / 60;

  const employees = await db.employee.count({ where: { status: 'ACTIVE' } });
  const periodDays =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  const workingDays = periodDays * (5 / 7); // Approx 5 working days per week
  const availableHours = employees * workingDays * 8; // 8 hours per day

  const current = availableHours > 0 ? (billedHours / availableHours) * 100 : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevTimeLogs = await db.timeLog.findMany({
    where: {
      logDate: { gte: previousPeriodStart, lt: periodStart },
      totalMinutes: { not: null },
    },
    select: { totalMinutes: true },
  });

  const prevBilledMinutes = prevTimeLogs.reduce(
    (sum, log) => sum + (log.totalMinutes || 0),
    0
  );
  const prevBilledHours = prevBilledMinutes / 60;
  const prevPeriodDays =
    (periodStart.getTime() - previousPeriodStart.getTime()) / (1000 * 60 * 60 * 24);
  const prevWorkingDays = prevPeriodDays * (5 / 7);
  const prevAvailableHours = employees * prevWorkingDays * 8;

  const previous =
    prevAvailableHours > 0 ? (prevBilledHours / prevAvailableHours) * 100 : 0;

  return createKPIResult({
    id: 'LABOUR_UTILIZATION',
    name: 'Labour Utilization Rate',
    category: 'COST',
    current,
    previous,
    target: 75, // Target: 75% utilization
    unit: '%',
    description: 'Percentage of available labour hours that are productive',
  });
}

/**
 * Calculate Budget Compliance
 * Formula: (Spent / Budget) × 100
 */
export async function calculateBudgetCompliance(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  // Get budget for the period
  const budget = await db.budget.findFirst({
    where: {
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
      status: 'APPROVED',
    },
    select: { totalAmount: true },
  });

  // Get total spend from job cards
  const jobCards = await db.jobCard.findMany({
    where: {
      actualEnd: { gte: periodStart, lte: periodEnd },
    },
    select: { actualCost: true },
  });

  const totalSpent = jobCards.reduce(
    (sum, jc) => sum + Number(jc.actualCost || 0),
    0
  );
  const budgetAmount = budget ? Number(budget.totalAmount) : 0;

  const current = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  // Previous period - get from snapshot
  const previousSnapshot = await db.kpiSnapshot.findFirst({
    where: { kpiCode: 'BUDGET_COMPLIANCE' },
    orderBy: { snapshotDate: 'desc' },
  });

  const previous = previousSnapshot ? previousSnapshot.value : 0;

  return createKPIResult({
    id: 'BUDGET_COMPLIANCE',
    name: 'Budget Compliance',
    category: 'COST',
    current,
    previous,
    target: 100, // Target: stay within budget
    unit: '%',
    description: 'Percentage of budget consumed',
    inverseStatus: true,
  });
}

// ============================================
// INVENTORY KPIs
// ============================================

/**
 * Calculate Stock Turnover Rate
 * Formula: Issues / Average Stock
 */
export async function calculateStockTurnoverRate(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  // Total issues in period
  const issues = await db.stockTransaction.findMany({
    where: {
      transactionType: 'ISSUE',
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { totalValue: true },
  });

  const totalIssues = issues.reduce(
    (sum, tx) => sum + Number(tx.totalValue || 0),
    0
  );

  // Average stock value
  const stock = await db.storeStock.findMany({
    select: { availableQty: true, wac: true },
  });

  const totalStockValue = stock.reduce(
    (sum, s) => sum + Number(s.availableQty || 0) * Number(s.wac || 0),
    0
  );
  const avgStock = totalStockValue / 2; // Simplified average

  const current = avgStock > 0 ? totalIssues / avgStock : 0;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevIssues = await db.stockTransaction.findMany({
    where: {
      transactionType: 'ISSUE',
      createdAt: { gte: previousPeriodStart, lt: periodStart },
    },
    select: { totalValue: true },
  });

  const prevTotalIssues = prevIssues.reduce(
    (sum, tx) => sum + Number(tx.totalValue || 0),
    0
  );
  const previous = avgStock > 0 ? prevTotalIssues / avgStock : 0;

  return createKPIResult({
    id: 'STOCK_TURNOVER',
    name: 'Stock Turnover Rate',
    category: 'INVENTORY',
    current,
    previous,
    target: 4, // Target: 4 turnovers per period
    unit: 'x',
    description: 'Number of times inventory is sold/used in the period',
  });
}

/**
 * Calculate Stockout Rate
 * Formula: (Stockout Events / Total Requests) × 100
 */
export async function calculateStockoutRate(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  // Items with zero stock but have had requests
  const lowStockItems = await db.storeStock.findMany({
    where: {
      availableQty: { equals: 0 },
    },
    select: { itemId: true },
  });

  const totalItems = await db.item.count({ where: { isActive: true } });
  const stockoutCount = lowStockItems.length;

  const current = totalItems > 0 ? (stockoutCount / totalItems) * 100 : 0;

  // Previous from snapshot
  const previousSnapshot = await db.kpiSnapshot.findFirst({
    where: { kpiCode: 'STOCKOUT_RATE' },
    orderBy: { snapshotDate: 'desc' },
  });

  const previous = previousSnapshot ? previousSnapshot.value : 0;

  return createKPIResult({
    id: 'STOCKOUT_RATE',
    name: 'Stockout Rate',
    category: 'INVENTORY',
    current,
    previous,
    target: 5, // Target: less than 5% stockout
    unit: '%',
    description: 'Percentage of items with zero stock',
    inverseStatus: true,
  });
}

/**
 * Calculate Inventory Accuracy
 * Formula: (Correct Counts / Total Counts) × 100
 */
export async function calculateInventoryAccuracy(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult> {
  // Get stock takes in period
  const stockTakes = await db.stockTakeHeader.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true },
  });

  let correctCounts = 0;
  let totalCounts = 0;

  for (const st of stockTakes) {
    const lines = await db.stockTakeLine.findMany({
      where: { headerId: st.id },
      select: { varianceQty: true },
    });

    totalCounts += lines.length;
    correctCounts += lines.filter((l) => Number(l.varianceQty || 0) === 0).length;
  }

  const current = totalCounts > 0 ? (correctCounts / totalCounts) * 100 : 100;

  // Previous period
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

  const prevStockTakes = await db.stockTakeHeader.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: previousPeriodStart, lt: periodStart },
    },
    select: { id: true },
  });

  let prevCorrect = 0;
  let prevTotal = 0;

  for (const st of prevStockTakes) {
    const lines = await db.stockTakeLine.findMany({
      where: { headerId: st.id },
      select: { varianceQty: true },
    });

    prevTotal += lines.length;
    prevCorrect += lines.filter((l) => Number(l.varianceQty || 0) === 0).length;
  }

  const previous = prevTotal > 0 ? (prevCorrect / prevTotal) * 100 : 100;

  return createKPIResult({
    id: 'INVENTORY_ACCURACY',
    name: 'Inventory Accuracy',
    category: 'INVENTORY',
    current,
    previous,
    target: 98, // Target: 98% accuracy
    unit: '%',
    description: 'Percentage of stock counts matching system records',
  });
}

/**
 * Calculate Obsolescence Rate
 * Formula: (Obsolete Value / Total Value) × 100
 */
export async function calculateObsolescenceRate(): Promise<KPIResult> {
  // Items with no movement in last 12 months
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const allStock = await db.storeStock.findMany({
    where: { lastMovementAt: { lt: oneYearAgo } },
    select: { availableQty: true, wac: true },
  });

  const obsoleteValue = allStock.reduce(
    (sum, s) => sum + Number(s.availableQty || 0) * Number(s.wac || 0),
    0
  );

  const totalStock = await db.storeStock.findMany({
    select: { availableQty: true, wac: true },
  });

  const totalValue = totalStock.reduce(
    (sum, s) => sum + Number(s.availableQty || 0) * Number(s.wac || 0),
    0
  );

  const current = totalValue > 0 ? (obsoleteValue / totalValue) * 100 : 0;

  // Previous from snapshot
  const previousSnapshot = await db.kpiSnapshot.findFirst({
    where: { kpiCode: 'OBSOLESCENCE_RATE' },
    orderBy: { snapshotDate: 'desc' },
  });

  const previous = previousSnapshot ? previousSnapshot.value : 0;

  return createKPIResult({
    id: 'OBSOLESCENCE_RATE',
    name: 'Obsolescence Rate',
    category: 'INVENTORY',
    current,
    previous,
    target: 5, // Target: less than 5% obsolete
    unit: '%',
    description: 'Percentage of inventory value that is obsolete',
    inverseStatus: true,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface KPIResultInput {
  id: string;
  name: string;
  category: 'OPERATIONAL' | 'RELIABILITY' | 'COST' | 'INVENTORY';
  current: number;
  previous: number;
  target: number;
  unit: string;
  description: string;
  inverseStatus?: boolean;
}

function createKPIResult(input: KPIResultInput): KPIResult {
  const { current, previous, target, inverseStatus = false } = input;

  // Calculate trend
  const diff = current - previous;
  let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (Math.abs(diff) > 0.01 * previous) {
    trend = diff > 0 ? 'UP' : 'DOWN';
  }

  const trendPercentage = previous !== 0 ? (diff / previous) * 100 : 0;

  // Determine status
  let status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' = 'ON_TRACK';
  const variance = inverseStatus
    ? ((current - target) / target) * 100
    : ((target - current) / target) * 100;

  if (variance < -20) {
    status = 'OFF_TRACK';
  } else if (variance < 0) {
    status = 'AT_RISK';
  }

  return {
    id: input.id,
    name: input.name,
    category: input.category,
    currentValue: Number(current.toFixed(2)),
    previousValue: Number(previous.toFixed(2)),
    trend,
    trendPercentage: Number(trendPercentage.toFixed(2)),
    target,
    status,
    unit: input.unit,
    description: input.description,
  };
}

// ============================================
// TREND ANALYSIS FUNCTIONS
// ============================================

/**
 * Calculate Simple Moving Average
 */
export function calculateMovingAverage(values: number[], periods: number): number[] {
  if (values.length < periods) return values;

  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < periods - 1) {
      result.push(values[i]);
    } else {
      const sum = values.slice(i - periods + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / periods);
    }
  }

  return result;
}

/**
 * Calculate Trend Direction and Percentage
 */
export function calculateTrend(values: number[]): {
  direction: 'UP' | 'DOWN' | 'STABLE';
  percentage: number;
} {
  if (values.length < 2) return { direction: 'STABLE', percentage: 0 };

  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  const percentage = first !== 0 ? (diff / first) * 100 : 0;

  let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (Math.abs(percentage) > 5) {
    direction = percentage > 0 ? 'UP' : 'DOWN';
  }

  return { direction, percentage };
}

// ============================================
// PREDICTION FUNCTIONS
// ============================================

/**
 * Linear Regression Prediction
 */
export function predictLinear(
  historicalValues: HistoricalValue[],
  periodsAhead: number
): KPIPrediction {
  if (historicalValues.length < 2) {
    return {
      kpiId: '',
      currentValue: historicalValues[0]?.value || 0,
      predictedValue: historicalValues[0]?.value || 0,
      predictionDate: new Date(Date.now() + periodsAhead * 30 * 24 * 60 * 60 * 1000),
      confidence: 0,
      method: 'LINEAR',
    };
  }

  const n = historicalValues.length;
  const x = historicalValues.map((_, i) => i);
  const y = historicalValues.map((v) => v.value);

  // Calculate linear regression
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const predictedValue = slope * (n - 1 + periodsAhead) + intercept;

  // Calculate R-squared for confidence
  const meanY = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return {
    kpiId: '',
    currentValue: historicalValues[historicalValues.length - 1].value,
    predictedValue: Math.max(0, predictedValue),
    predictionDate: new Date(Date.now() + periodsAhead * 30 * 24 * 60 * 60 * 1000),
    confidence: Math.max(0, Math.min(100, rSquared * 100)),
    method: 'LINEAR',
  };
}

/**
 * Exponential Smoothing Prediction
 */
export function predictExponentialSmoothing(
  values: number[],
  alpha: number,
  periodsAhead: number
): number {
  if (values.length === 0) return 0;

  let smoothed = values[0];

  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }

  // Forecast is the last smoothed value
  return smoothed;
}

// ============================================
// AGGREGATE FUNCTIONS
// ============================================

/**
 * Get all Operational KPIs
 */
export async function calculateOperationalKPIs(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult[]> {
  const results = await Promise.all([
    calculateJobCardCompletionRate(periodStart, periodEnd),
    calculateMTTR(periodStart, periodEnd),
    calculateFirstTimeFixRate(periodStart, periodEnd),
    calculateSLAComplianceRate(periodStart, periodEnd),
    calculateWorkOrderBacklog(),
  ]);

  return results;
}

/**
 * Get all Reliability KPIs
 */
export async function calculateReliabilityKPIs(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult[]> {
  const results = await Promise.all([
    calculateMTBFByCategory(periodStart, periodEnd),
    calculateAssetAvailabilityRate(),
    calculatePlannedUnplannedRatio(periodStart, periodEnd),
    calculateFailureFrequency(periodStart, periodEnd),
  ]);

  return results;
}

/**
 * Get all Cost KPIs
 */
export async function calculateCostKPIs(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult[]> {
  const results = await Promise.all([
    calculateCostPerRepair(periodStart, periodEnd),
    calculateMaterialCostVariance(periodStart, periodEnd),
    calculateLabourUtilizationRate(periodStart, periodEnd),
    calculateBudgetCompliance(periodStart, periodEnd),
  ]);

  return results;
}

/**
 * Get all Inventory KPIs
 */
export async function calculateInventoryKPIs(
  periodStart: Date,
  periodEnd: Date
): Promise<KPIResult[]> {
  const results = await Promise.all([
    calculateStockTurnoverRate(periodStart, periodEnd),
    calculateStockoutRate(periodStart, periodEnd),
    calculateInventoryAccuracy(periodStart, periodEnd),
    calculateObsolescenceRate(),
  ]);

  return results;
}

/**
 * Get all KPIs with optional predictions
 */
export async function getAllKPIs(
  periodStart: Date,
  periodEnd: Date,
  includePredictions: boolean = false
): Promise<{
  kpis: KPIResult[];
  predictions?: Map<string, KPIPrediction>;
}> {
  const [operational, reliability, cost, inventory] = await Promise.all([
    calculateOperationalKPIs(periodStart, periodEnd),
    calculateReliabilityKPIs(periodStart, periodEnd),
    calculateCostKPIs(periodStart, periodEnd),
    calculateInventoryKPIs(periodStart, periodEnd),
  ]);

  const kpis = [...operational, ...reliability, ...cost, ...inventory];

  let predictions: Map<string, KPIPrediction> | undefined;

  if (includePredictions) {
    predictions = new Map();

    for (const kpi of kpis) {
      // Get historical values from snapshots
      const snapshots = await db.kpiSnapshot.findMany({
        where: {
          kpiCode: kpi.id,
        },
        orderBy: { snapshotDate: 'asc' },
        take: 12, // Last 12 periods
        select: { value: true, snapshotDate: true },
      });

      if (snapshots.length >= 3) {
        const historicalValues: HistoricalValue[] = snapshots.map((s) => ({
          date: s.snapshotDate,
          value: s.value,
        }));

        const prediction = predictLinear(historicalValues, 1);
        prediction.kpiId = kpi.id;
        predictions.set(kpi.id, prediction);
      }
    }
  }

  return { kpis, predictions };
}
