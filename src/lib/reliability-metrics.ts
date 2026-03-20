import { db } from '@/lib/db';

// ============================================
// RELIABILITY METRICS INTERFACES
// ============================================

export interface ReliabilityMetrics {
  mtbf: number; // hours - Mean Time Between Failures
  mttr: number; // hours - Mean Time To Repair
  availability: number; // percentage (0-100)
  reliabilityRate: number; // percentage (0-100)
  totalFailures: number;
  totalDowntime: number; // hours
  totalOperatingTime: number; // hours
}

export interface AssetReliability extends ReliabilityMetrics {
  assetId: string;
  assetNumber: string;
  assetName: string;
  category: string;
  categoryId: string;
}

export interface CategoryReliability extends ReliabilityMetrics {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  assetCount: number;
}

export interface FleetReliability extends ReliabilityMetrics {
  totalAssets: number;
  operationalAssets: number;
  underRepairAssets: number;
}

export interface MtbfTrend {
  period: string; // Month label (e.g., "Jan 2024")
  periodStart: Date;
  periodEnd: Date;
  mtbf: number;
  failureCount: number;
  downtimeHours: number;
}

export interface FailureCause {
  cause: string;
  count: number;
  percentage: number;
  totalDowntime: number;
}

export interface RepairTimeDistribution {
  category: string;
  avgRepairTime: number;
  minRepairTime: number;
  maxRepairTime: number;
  repairCount: number;
}

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Mean Time Between Failures (MTBF)
 * MTBF = Operating Time / Number of Failures
 * 
 * @param downtimeHours - Total downtime in hours
 * @param failureCount - Number of failures
 * @param operatingHours - Total operating hours in the period
 * @returns MTBF in hours
 */
export function calculateMTBF(
  downtimeHours: number,
  failureCount: number,
  operatingHours: number
): number {
  if (failureCount === 0) {
    // No failures means MTBF equals the entire operating period
    return operatingHours;
  }
  
  const effectiveOperatingTime = operatingHours - downtimeHours;
  return Math.max(0, effectiveOperatingTime / failureCount);
}

/**
 * Calculate Mean Time To Repair (MTTR)
 * MTTR = Total Repair Duration / Number of Repairs
 * 
 * @param totalRepairHours - Sum of all repair durations in hours
 * @param repairCount - Number of completed repairs
 * @returns MTTR in hours
 */
export function calculateMTTR(
  totalRepairHours: number,
  repairCount: number
): number {
  if (repairCount === 0) {
    return 0;
  }
  return totalRepairHours / repairCount;
}

/**
 * Calculate Availability
 * Availability = Operating Time / (Operating Time + Downtime) * 100
 * 
 * @param operatingTime - Total operating time in hours
 * @param downtime - Total downtime in hours
 * @returns Availability as percentage (0-100)
 */
export function calculateAvailability(
  operatingTime: number,
  downtime: number
): number {
  const totalTime = operatingTime + downtime;
  if (totalTime === 0) {
    return 100; // No time means fully available
  }
  return (operatingTime / totalTime) * 100;
}

/**
 * Calculate Reliability Rate
 * Reliability Rate = MTBF / (MTBF + MTTR) * 100
 * 
 * @param mtbf - Mean Time Between Failures in hours
 * @param mttr - Mean Time To Repair in hours
 * @returns Reliability Rate as percentage (0-100)
 */
export function calculateReliabilityRate(
  mtbf: number,
  mttr: number
): number {
  const total = mtbf + mttr;
  if (total === 0) {
    return 100;
  }
  return (mtbf / total) * 100;
}

// ============================================
// DATA RETRIEVAL FUNCTIONS
// ============================================

/**
 * Calculate operating hours for a period
 * Assumes 24/7 operation by default, can be adjusted
 */
function calculatePeriodHours(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // Convert ms to hours
}

/**
 * Get reliability metrics for a specific asset
 */
export async function getAssetReliability(
  assetId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<AssetReliability> {
  // Get asset info
  const asset = await db.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      assetNumber: true,
      name: true,
      categoryId: true,
      category: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  const operatingHours = calculatePeriodHours(periodStart, periodEnd);

  // Get downtime logs for breakdown events
  const downtimeLogs = await db.downtimeLog.findMany({
    where: {
      assetId,
      downtimeType: 'BREAKDOWN',
      startTime: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      totalMinutes: true,
      startTime: true,
      endTime: true,
    },
  });

  // Get job cards with repair durations
  const jobCards = await db.jobCard.findMany({
    where: {
      assetId,
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualStart: { not: null },
      actualEnd: { not: null },
      actualEnd: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      actualStart: true,
      actualEnd: true,
      actualDuration: true,
    },
  });

  // Calculate total downtime
  let totalDowntimeMinutes = 0;
  const failureCount = downtimeLogs.length;

  downtimeLogs.forEach((log) => {
    if (log.totalMinutes) {
      totalDowntimeMinutes += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      totalDowntimeMinutes += diff / (1000 * 60);
    }
  });

  const totalDowntimeHours = totalDowntimeMinutes / 60;

  // Calculate total repair time
  let totalRepairHours = 0;
  const repairCount = jobCards.length;

  jobCards.forEach((jc) => {
    if (jc.actualDuration) {
      totalRepairHours += Number(jc.actualDuration);
    } else if (jc.actualStart && jc.actualEnd) {
      const diff = new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime();
      totalRepairHours += diff / (1000 * 60 * 60);
    }
  });

  // Calculate metrics
  const mtbf = calculateMTBF(totalDowntimeHours, failureCount, operatingHours);
  const mttr = calculateMTTR(totalRepairHours, repairCount);
  const availability = calculateAvailability(operatingHours - totalDowntimeHours, totalDowntimeHours);
  const reliabilityRate = calculateReliabilityRate(mtbf, mttr);

  return {
    assetId: asset.id,
    assetNumber: asset.assetNumber,
    assetName: asset.name,
    category: asset.category?.name || 'Unknown',
    categoryId: asset.categoryId,
    mtbf: Number(mtbf.toFixed(2)),
    mttr: Number(mttr.toFixed(2)),
    availability: Number(availability.toFixed(2)),
    reliabilityRate: Number(reliabilityRate.toFixed(2)),
    totalFailures: failureCount,
    totalDowntime: Number(totalDowntimeHours.toFixed(2)),
    totalOperatingTime: Number((operatingHours - totalDowntimeHours).toFixed(2)),
  };
}

/**
 * Get reliability metrics for all assets in a category
 */
export async function getCategoryReliability(
  categoryId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<CategoryReliability> {
  // Get category info
  const category = await db.assetCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, code: true, name: true },
  });

  if (!category) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  // Get assets in category
  const assets = await db.asset.findMany({
    where: {
      categoryId,
      isActive: true,
    },
    select: { id: true },
  });

  const assetIds = assets.map((a) => a.id);
  const operatingHours = calculatePeriodHours(periodStart, periodEnd);
  const totalAssetOperatingHours = operatingHours * assets.length;

  // Get downtime logs for all assets in category
  const downtimeLogs = await db.downtimeLog.findMany({
    where: {
      assetId: { in: assetIds },
      downtimeType: 'BREAKDOWN',
      startTime: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      totalMinutes: true,
      startTime: true,
      endTime: true,
    },
  });

  // Get job cards for all assets in category
  const jobCards = await db.jobCard.findMany({
    where: {
      assetId: { in: assetIds },
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualStart: { not: null },
      actualEnd: { not: null },
      actualEnd: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      actualStart: true,
      actualEnd: true,
      actualDuration: true,
    },
  });

  // Calculate totals
  let totalDowntimeMinutes = 0;
  const failureCount = downtimeLogs.length;

  downtimeLogs.forEach((log) => {
    if (log.totalMinutes) {
      totalDowntimeMinutes += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      totalDowntimeMinutes += diff / (1000 * 60);
    }
  });

  const totalDowntimeHours = totalDowntimeMinutes / 60;

  let totalRepairHours = 0;
  const repairCount = jobCards.length;

  jobCards.forEach((jc) => {
    if (jc.actualDuration) {
      totalRepairHours += Number(jc.actualDuration);
    } else if (jc.actualStart && jc.actualEnd) {
      const diff = new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime();
      totalRepairHours += diff / (1000 * 60 * 60);
    }
  });

  // Calculate metrics
  const mtbf = calculateMTBF(totalDowntimeHours, failureCount, totalAssetOperatingHours);
  const mttr = calculateMTTR(totalRepairHours, repairCount);
  const availability = calculateAvailability(
    totalAssetOperatingHours - totalDowntimeHours,
    totalDowntimeHours
  );
  const reliabilityRate = calculateReliabilityRate(mtbf, mttr);

  return {
    categoryId: category.id,
    categoryCode: category.code,
    categoryName: category.name,
    assetCount: assets.length,
    mtbf: Number(mtbf.toFixed(2)),
    mttr: Number(mttr.toFixed(2)),
    availability: Number(availability.toFixed(2)),
    reliabilityRate: Number(reliabilityRate.toFixed(2)),
    totalFailures: failureCount,
    totalDowntime: Number(totalDowntimeHours.toFixed(2)),
    totalOperatingTime: Number((totalAssetOperatingHours - totalDowntimeHours).toFixed(2)),
  };
}

/**
 * Get fleet-wide reliability metrics
 */
export async function getFleetReliability(
  periodStart: Date,
  periodEnd: Date
): Promise<FleetReliability> {
  // Get all active assets
  const assets = await db.asset.findMany({
    where: { isActive: true },
    select: { id: true, status: true },
  });

  const assetIds = assets.map((a) => a.id);
  const operatingHours = calculatePeriodHours(periodStart, periodEnd);
  const totalAssetOperatingHours = operatingHours * assets.length;

  // Get downtime logs
  const downtimeLogs = await db.downtimeLog.findMany({
    where: {
      assetId: { in: assetIds },
      downtimeType: 'BREAKDOWN',
      startTime: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      totalMinutes: true,
      startTime: true,
      endTime: true,
    },
  });

  // Get job cards
  const jobCards = await db.jobCard.findMany({
    where: {
      assetId: { in: assetIds },
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualStart: { not: null },
      actualEnd: { not: null },
      actualEnd: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      actualStart: true,
      actualEnd: true,
      actualDuration: true,
    },
  });

  // Calculate totals
  let totalDowntimeMinutes = 0;

  downtimeLogs.forEach((log) => {
    if (log.totalMinutes) {
      totalDowntimeMinutes += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      totalDowntimeMinutes += diff / (1000 * 60);
    }
  });

  const totalDowntimeHours = totalDowntimeMinutes / 60;

  let totalRepairHours = 0;

  jobCards.forEach((jc) => {
    if (jc.actualDuration) {
      totalRepairHours += Number(jc.actualDuration);
    } else if (jc.actualStart && jc.actualEnd) {
      const diff = new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime();
      totalRepairHours += diff / (1000 * 60 * 60);
    }
  });

  // Calculate metrics
  const mtbf = calculateMTBF(totalDowntimeHours, downtimeLogs.length, totalAssetOperatingHours);
  const mttr = calculateMTTR(totalRepairHours, jobCards.length);
  const availability = calculateAvailability(
    totalAssetOperatingHours - totalDowntimeHours,
    totalDowntimeHours
  );
  const reliabilityRate = calculateReliabilityRate(mtbf, mttr);

  const operationalAssets = assets.filter((a) => a.status === 'OPERATIONAL').length;
  const underRepairAssets = assets.filter((a) => a.status === 'UNDER_REPAIR').length;

  return {
    totalAssets: assets.length,
    operationalAssets,
    underRepairAssets,
    mtbf: Number(mtbf.toFixed(2)),
    mttr: Number(mttr.toFixed(2)),
    availability: Number(availability.toFixed(2)),
    reliabilityRate: Number(reliabilityRate.toFixed(2)),
    totalFailures: downtimeLogs.length,
    totalDowntime: Number(totalDowntimeHours.toFixed(2)),
    totalOperatingTime: Number((totalAssetOperatingHours - totalDowntimeHours).toFixed(2)),
  };
}

/**
 * Get MTBF trend over months
 */
export async function getMtbfTrend(
  months: number = 6,
  assetId?: string,
  categoryId?: string
): Promise<MtbfTrend[]> {
  const now = new Date();
  const trends: MtbfTrend[] = [];

  // Build asset filter
  let assetIds: string[] | undefined;
  if (assetId) {
    assetIds = [assetId];
  } else if (categoryId) {
    const assets = await db.asset.findMany({
      where: { categoryId, isActive: true },
      select: { id: true },
    });
    assetIds = assets.map((a) => a.id);
  }

  for (let i = months - 1; i >= 0; i--) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    
    // Get downtime logs for this month
    const whereClause: {
      downtimeType: string;
      startTime: { gte: Date; lte: Date };
      assetId?: { in: string[] };
    } = {
      downtimeType: 'BREAKDOWN',
      startTime: { gte: periodStart, lte: periodEnd },
    };
    
    if (assetIds) {
      whereClause.assetId = { in: assetIds };
    }

    const downtimeLogs = await db.downtimeLog.findMany({
      where: whereClause,
      select: {
        totalMinutes: true,
        startTime: true,
        endTime: true,
      },
    });

    // Calculate total downtime
    let totalDowntimeMinutes = 0;
    downtimeLogs.forEach((log) => {
      if (log.totalMinutes) {
        totalDowntimeMinutes += Number(log.totalMinutes);
      } else if (log.startTime && log.endTime) {
        const diff = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
        totalDowntimeMinutes += diff / (1000 * 60);
      }
    });

    const downtimeHours = totalDowntimeMinutes / 60;
    const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
    const operatingHours = daysInMonth * 24; // 24/7 operation
    
    const mtbf = calculateMTBF(downtimeHours, downtimeLogs.length, operatingHours);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    trends.push({
      period: `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`,
      periodStart,
      periodEnd,
      mtbf: Number(mtbf.toFixed(2)),
      failureCount: downtimeLogs.length,
      downtimeHours: Number(downtimeHours.toFixed(2)),
    });
  }

  return trends;
}

/**
 * Get MTTR by asset category for comparison
 */
export async function getMttrByCategory(
  periodStart: Date,
  periodEnd: Date
): Promise<RepairTimeDistribution[]> {
  // Get all categories
  const categories = await db.assetCategory.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
  });

  const results: RepairTimeDistribution[] = [];

  for (const category of categories) {
    // Get assets in this category
    const assets = await db.asset.findMany({
      where: { categoryId: category.id, isActive: true },
      select: { id: true },
    });

    if (assets.length === 0) continue;

    const assetIds = assets.map((a) => a.id);

    // Get job cards for these assets
    const jobCards = await db.jobCard.findMany({
      where: {
        assetId: { in: assetIds },
        status: { in: ['COMPLETED', 'CLOSED'] },
        actualStart: { not: null },
        actualEnd: { not: null },
        actualEnd: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        actualStart: true,
        actualEnd: true,
        actualDuration: true,
      },
    });

    if (jobCards.length === 0) continue;

    const repairTimes: number[] = [];

    jobCards.forEach((jc) => {
      if (jc.actualDuration) {
        repairTimes.push(Number(jc.actualDuration));
      } else if (jc.actualStart && jc.actualEnd) {
        const diff = new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime();
        repairTimes.push(diff / (1000 * 60 * 60));
      }
    });

    if (repairTimes.length > 0) {
      results.push({
        category: category.name,
        avgRepairTime: Number((repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length).toFixed(2)),
        minRepairTime: Number(Math.min(...repairTimes).toFixed(2)),
        maxRepairTime: Number(Math.max(...repairTimes).toFixed(2)),
        repairCount: repairTimes.length,
      });
    }
  }

  return results.sort((a, b) => b.repairCount - a.repairCount);
}

/**
 * Get asset reliability ranking
 */
export async function getAssetReliabilityRanking(
  periodStart: Date,
  periodEnd: Date,
  limit: number = 10,
  sortBy: 'reliability' | 'failures' | 'downtime' = 'reliability'
): Promise<AssetReliability[]> {
  // Get all active assets
  const assets = await db.asset.findMany({
    where: { isActive: true },
    select: {
      id: true,
      assetNumber: true,
      name: true,
      categoryId: true,
      category: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  const operatingHours = calculatePeriodHours(periodStart, periodEnd);
  const assetMetrics: AssetReliability[] = [];

  // Get all downtime logs at once
  const downtimeLogs = await db.downtimeLog.findMany({
    where: {
      downtimeType: 'BREAKDOWN',
      startTime: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      assetId: true,
      totalMinutes: true,
      startTime: true,
      endTime: true,
    },
  });

  // Get all job cards at once
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      actualStart: { not: null },
      actualEnd: { not: null },
      actualEnd: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      assetId: true,
      actualStart: true,
      actualEnd: true,
      actualDuration: true,
    },
  });

  // Group by asset
  const downtimeByAsset = new Map<string, { count: number; minutes: number }>();
  const repairsByAsset = new Map<string, number>();

  downtimeLogs.forEach((log) => {
    const existing = downtimeByAsset.get(log.assetId) || { count: 0, minutes: 0 };
    existing.count++;
    
    if (log.totalMinutes) {
      existing.minutes += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      existing.minutes += diff / (1000 * 60);
    }
    
    downtimeByAsset.set(log.assetId, existing);
  });

  jobCards.forEach((jc) => {
    let repairHours = repairsByAsset.get(jc.assetId) || 0;
    
    if (jc.actualDuration) {
      repairHours += Number(jc.actualDuration);
    } else if (jc.actualStart && jc.actualEnd) {
      const diff = new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime();
      repairHours += diff / (1000 * 60 * 60);
    }
    
    repairsByAsset.set(jc.assetId, repairHours);
  });

  // Calculate metrics for each asset
  assets.forEach((asset) => {
    const downtime = downtimeByAsset.get(asset.id) || { count: 0, minutes: 0 };
    const repairHours = repairsByAsset.get(asset.id) || 0;
    const downtimeHours = downtime.minutes / 60;
    const repairCount = jobCards.filter(jc => jc.assetId === asset.id).length;

    const mtbf = calculateMTBF(downtimeHours, downtime.count, operatingHours);
    const mttr = calculateMTTR(repairHours, repairCount);
    const availability = calculateAvailability(operatingHours - downtimeHours, downtimeHours);
    const reliabilityRate = calculateReliabilityRate(mtbf, mttr);

    assetMetrics.push({
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      category: asset.category?.name || 'Unknown',
      categoryId: asset.categoryId,
      mtbf: Number(mtbf.toFixed(2)),
      mttr: Number(mttr.toFixed(2)),
      availability: Number(availability.toFixed(2)),
      reliabilityRate: Number(reliabilityRate.toFixed(2)),
      totalFailures: downtime.count,
      totalDowntime: Number(downtimeHours.toFixed(2)),
      totalOperatingTime: Number((operatingHours - downtimeHours).toFixed(2)),
    });
  });

  // Sort based on sortBy parameter
  let sorted: AssetReliability[];
  switch (sortBy) {
    case 'failures':
      sorted = assetMetrics.sort((a, b) => b.totalFailures - a.totalFailures);
      break;
    case 'downtime':
      sorted = assetMetrics.sort((a, b) => b.totalDowntime - a.totalDowntime);
      break;
    case 'reliability':
    default:
      sorted = assetMetrics.sort((a, b) => a.reliabilityRate - b.reliabilityRate);
  }

  return sorted.slice(0, limit);
}

/**
 * Get failure frequency by cause for Pareto analysis
 */
export async function getFailureFrequencyByCause(
  periodStart: Date,
  periodEnd: Date
): Promise<FailureCause[]> {
  // Get all downtime logs with reasons
  const downtimeLogs = await db.downtimeLog.findMany({
    where: {
      downtimeType: 'BREAKDOWN',
      startTime: {
        gte: periodStart,
        lte: periodEnd,
      },
      reason: { not: null },
    },
    select: {
      reason: true,
      totalMinutes: true,
      startTime: true,
      endTime: true,
    },
  });

  // Group by reason
  const causeMap = new Map<string, { count: number; downtime: number }>();

  downtimeLogs.forEach((log) => {
    const cause = log.reason || 'Unknown';
    const existing = causeMap.get(cause) || { count: 0, downtime: 0 };
    
    existing.count++;
    
    if (log.totalMinutes) {
      existing.downtime += Number(log.totalMinutes);
    } else if (log.startTime && log.endTime) {
      const diff = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      existing.downtime += diff / (1000 * 60);
    }
    
    causeMap.set(cause, existing);
  });

  const totalFailures = downtimeLogs.length;

  // Build result array
  const results: FailureCause[] = Array.from(causeMap.entries()).map(([cause, data]) => ({
    cause,
    count: data.count,
    percentage: totalFailures > 0 ? Number(((data.count / totalFailures) * 100).toFixed(1)) : 0,
    totalDowntime: Number((data.downtime / 60).toFixed(2)), // Convert to hours
  }));

  // Sort by count descending (Pareto order)
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get all category reliability metrics
 */
export async function getAllCategoryReliability(
  periodStart: Date,
  periodEnd: Date
): Promise<CategoryReliability[]> {
  const categories = await db.assetCategory.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const results: CategoryReliability[] = [];

  for (const category of categories) {
    try {
      const metrics = await getCategoryReliability(category.id, periodStart, periodEnd);
      if (metrics.assetCount > 0) {
        results.push(metrics);
      }
    } catch (error) {
      // Skip categories with errors
      console.error(`Error getting reliability for category ${category.id}:`, error);
    }
  }

  return results.sort((a, b) => a.reliabilityRate - b.reliabilityRate);
}
