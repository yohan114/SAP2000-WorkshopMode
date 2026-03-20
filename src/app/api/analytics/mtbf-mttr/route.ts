import { apiSuccess, apiError } from '@/lib/api-utils';
import {
  getAssetReliability,
  getCategoryReliability,
  getFleetReliability,
  getMtbfTrend,
  getMttrByCategory,
  getAssetReliabilityRanking,
  getFailureFrequencyByCause,
  getAllCategoryReliability,
  type AssetReliability,
  type CategoryReliability,
  type FleetReliability,
  type MtbfTrend,
  type RepairTimeDistribution,
  type FailureCause,
} from '@/lib/reliability-metrics';

// ============================================
// REQUEST PARAMETER TYPES
// ============================================

interface MtbfMttrQueryParams {
  periodStart?: string;
  periodEnd?: string;
  assetId?: string;
  categoryId?: string;
  groupBy?: 'asset' | 'category' | 'fleet';
  months?: string;
  limit?: string;
  sortBy?: 'reliability' | 'failures' | 'downtime';
}

// ============================================
// RESPONSE TYPES
// ============================================

interface AssetResponse {
  asset: AssetReliability;
  mtbfTrend: MtbfTrend[];
}

interface CategoryResponse {
  category: CategoryReliability;
  assets: AssetReliability[];
  mtbfTrend: MtbfTrend[];
}

interface FleetResponse {
  fleet: FleetReliability;
  categories: CategoryReliability[];
  mtbfTrend: MtbfTrend[];
  mttrByCategory: RepairTimeDistribution[];
  topProblematicAssets: AssetReliability[];
  failureCauses: FailureCause[];
}

// ============================================
// API HANDLER
// ============================================

// GET /api/analytics/mtbf-mttr - Get MTBF/MTTR data
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params: MtbfMttrQueryParams = {
      periodStart: url.searchParams.get('periodStart') || undefined,
      periodEnd: url.searchParams.get('periodEnd') || undefined,
      assetId: url.searchParams.get('assetId') || undefined,
      categoryId: url.searchParams.get('categoryId') || undefined,
      groupBy: (url.searchParams.get('groupBy') as 'asset' | 'category' | 'fleet') || 'fleet',
      months: url.searchParams.get('months') || '6',
      limit: url.searchParams.get('limit') || '10',
      sortBy: (url.searchParams.get('sortBy') as 'reliability' | 'failures' | 'downtime') || 'reliability',
    };

    // Parse dates - default to last 6 months if not provided
    const now = new Date();
    const periodEnd = params.periodEnd ? new Date(params.periodEnd) : now;
    const periodStart = params.periodStart
      ? new Date(params.periodStart)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const months = parseInt(params.months || '6', 10);
    const limit = parseInt(params.limit || '10', 10);

    // Handle different grouping options
    switch (params.groupBy) {
      case 'asset': {
        if (!params.assetId) {
          return apiError('assetId is required when groupBy is "asset"', 400);
        }

        const asset = await getAssetReliability(params.assetId, periodStart, periodEnd);
        const mtbfTrend = await getMtbfTrend(months, params.assetId);

        const response: AssetResponse = {
          asset,
          mtbfTrend,
        };

        return apiSuccess(response);
      }

      case 'category': {
        if (!params.categoryId) {
          return apiError('categoryId is required when groupBy is "category"', 400);
        }

        const category = await getCategoryReliability(params.categoryId, periodStart, periodEnd);
        const mtbfTrend = await getMtbfTrend(months, undefined, params.categoryId);

        // Get assets in this category
        const { db } = await import('@/lib/db');
        const assetsInCategory = await db.asset.findMany({
          where: { categoryId: params.categoryId, isActive: true },
          select: { id: true },
        });

        const assetMetrics: AssetReliability[] = [];
        for (const a of assetsInCategory) {
          try {
            const metrics = await getAssetReliability(a.id, periodStart, periodEnd);
            assetMetrics.push(metrics);
          } catch {
            // Skip assets with errors
          }
        }

        const response: CategoryResponse = {
          category,
          assets: assetMetrics.sort((a, b) => a.reliabilityRate - b.reliabilityRate),
          mtbfTrend,
        };

        return apiSuccess(response);
      }

      case 'fleet':
      default: {
        // Get comprehensive fleet-wide data
        const [
          fleet,
          categories,
          mtbfTrend,
          mttrByCategory,
          topProblematicAssets,
          failureCauses,
        ] = await Promise.all([
          getFleetReliability(periodStart, periodEnd),
          getAllCategoryReliability(periodStart, periodEnd),
          getMtbfTrend(months),
          getMttrByCategory(periodStart, periodEnd),
          getAssetReliabilityRanking(periodStart, periodEnd, limit, params.sortBy),
          getFailureFrequencyByCause(periodStart, periodEnd),
        ]);

        const response: FleetResponse = {
          fleet,
          categories,
          mtbfTrend,
          mttrByCategory,
          topProblematicAssets,
          failureCauses,
        };

        return apiSuccess(response);
      }
    }
  } catch (error) {
    console.error('MTBF/MTTR API error:', error);
    return apiError(
      error instanceof Error ? error.message : 'Failed to fetch MTBF/MTTR data',
      500
    );
  }
}
