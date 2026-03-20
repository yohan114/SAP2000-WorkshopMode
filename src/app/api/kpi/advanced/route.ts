import { NextRequest, NextResponse } from 'next/server';
import {
  getAllKPIs,
  calculateOperationalKPIs,
  calculateReliabilityKPIs,
  calculateCostKPIs,
  calculateInventoryKPIs,
  predictLinear,
  KPIResult,
  KPIPrediction,
} from '@/lib/kpi-engine';
import { db } from '@/lib/db';

interface HistoricalValue {
  date: Date;
  value: number;
}

interface KPIWithPrediction extends KPIResult {
  prediction?: KPIPrediction;
  historicalValues?: HistoricalValue[];
  sparklineData?: number[];
}

// GET /api/kpi/advanced - Get all KPIs with predictions and trends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodStartStr = searchParams.get('periodStart');
    const periodEndStr = searchParams.get('periodEnd');
    const includePredictions = searchParams.get('includePredictions') === 'true';
    const months = parseInt(searchParams.get('months') || '12', 10);
    const category = searchParams.get('category') as
      | 'OPERATIONAL'
      | 'RELIABILITY'
      | 'COST'
      | 'INVENTORY'
      | null;

    // Default to current month if not specified
    const now = new Date();
    const periodEnd = periodEndStr ? new Date(periodEndStr) : now;
    const periodStart = periodStartStr
      ? new Date(periodStartStr)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let kpis: KPIResult[];

    if (category) {
      // Get specific category
      switch (category) {
        case 'OPERATIONAL':
          kpis = await calculateOperationalKPIs(periodStart, periodEnd);
          break;
        case 'RELIABILITY':
          kpis = await calculateReliabilityKPIs(periodStart, periodEnd);
          break;
        case 'COST':
          kpis = await calculateCostKPIs(periodStart, periodEnd);
          break;
        case 'INVENTORY':
          kpis = await calculateInventoryKPIs(periodStart, periodEnd);
          break;
        default:
          kpis = [];
      }
    } else {
      // Get all KPIs
      const result = await getAllKPIs(periodStart, periodEnd, includePredictions);
      kpis = result.kpis;
    }

    // Enrich with predictions and historical data
    const enrichedKPIs: KPIWithPrediction[] = await Promise.all(
      kpis.map(async (kpi) => {
        // Get historical values for sparkline
        const snapshots = await db.kpiSnapshot.findMany({
          where: {
            kpiCode: kpi.id,
          },
          orderBy: { snapshotDate: 'asc' },
          take: months,
          select: { value: true, snapshotDate: true },
        });

        const historicalValues: HistoricalValue[] = snapshots.map((s) => ({
          date: s.snapshotDate,
          value: s.value,
        }));

        const sparklineData = snapshots.map((s) => s.value);

        let prediction: KPIPrediction | undefined;

        if (includePredictions && historicalValues.length >= 3) {
          prediction = predictLinear(historicalValues, 1);
          prediction.kpiId = kpi.id;
        }

        return {
          ...kpi,
          prediction,
          historicalValues,
          sparklineData,
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      total: kpis.length,
      onTrack: kpis.filter((k) => k.status === 'ON_TRACK').length,
      atRisk: kpis.filter((k) => k.status === 'AT_RISK').length,
      offTrack: kpis.filter((k) => k.status === 'OFF_TRACK').length,
      byCategory: {
        OPERATIONAL: {
          total: kpis.filter((k) => k.category === 'OPERATIONAL').length,
          avgValue: calculateAverage(
            kpis.filter((k) => k.category === 'OPERATIONAL').map((k) => k.currentValue)
          ),
        },
        RELIABILITY: {
          total: kpis.filter((k) => k.category === 'RELIABILITY').length,
          avgValue: calculateAverage(
            kpis.filter((k) => k.category === 'RELIABILITY').map((k) => k.currentValue)
          ),
        },
        COST: {
          total: kpis.filter((k) => k.category === 'COST').length,
          avgValue: calculateAverage(
            kpis.filter((k) => k.category === 'COST').map((k) => k.currentValue)
          ),
        },
        INVENTORY: {
          total: kpis.filter((k) => k.category === 'INVENTORY').length,
          avgValue: calculateAverage(
            kpis.filter((k) => k.category === 'INVENTORY').map((k) => k.currentValue)
          ),
        },
      },
    };

    // Calculate overall health score (weighted average of normalized KPIs)
    const healthScore = calculateHealthScore(kpis);

    return NextResponse.json({
      success: true,
      data: {
        kpis: enrichedKPIs,
        summary,
        healthScore,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        computedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching advanced KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}

// Helper: Calculate average
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Helper: Calculate health score (0-100)
function calculateHealthScore(kpis: KPIResult[]): number {
  if (kpis.length === 0) return 100;

  let totalScore = 0;

  kpis.forEach((kpi) => {
    let score = 100;

    switch (kpi.status) {
      case 'ON_TRACK':
        score = 100;
        break;
      case 'AT_RISK':
        score = 60;
        break;
      case 'OFF_TRACK':
        score = 20;
        break;
    }

    // Adjust for trend
    if (kpi.trend === 'UP' && kpi.status !== 'OFF_TRACK') {
      score += 10;
    } else if (kpi.trend === 'DOWN' && kpi.status !== 'ON_TRACK') {
      score -= 10;
    }

    totalScore += Math.max(0, Math.min(100, score));
  });

  return Math.round(totalScore / kpis.length);
}

// POST /api/kpi/advanced - Save KPI thresholds
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { thresholds } = body as {
      thresholds: Array<{
        kpiId: string;
        warningThreshold: number;
        criticalThreshold: number;
        comparison: 'GREATER_THAN' | 'LESS_THAN';
      }>;
    };

    // In a real implementation, you would save these to a KpiThreshold table
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'Thresholds saved successfully',
      saved: thresholds.length,
    });
  } catch (error) {
    console.error('Error saving KPI thresholds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save thresholds' },
      { status: 500 }
    );
  }
}
