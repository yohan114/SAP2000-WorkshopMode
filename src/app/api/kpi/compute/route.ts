import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// KPI definitions with computation methods
const KPI_CONFIGS = [
  {
    code: 'KPI-01',
    name: 'Fleet Availability Rate',
    category: 'Fleet',
    unit: '%',
    defaultAmber: 90,
    defaultRed: 80,
    higherIsWorse: false,
  },
  {
    code: 'KPI-02',
    name: 'PM Compliance Rate',
    category: 'PM',
    unit: '%',
    defaultAmber: 85,
    defaultRed: 70,
    higherIsWorse: false,
  },
  {
    code: 'KPI-03',
    name: 'Mean Time to Repair (MTTR)',
    category: 'Efficiency',
    unit: 'hours',
    defaultAmber: 24,
    defaultRed: 48,
    higherIsWorse: true,
  },
  {
    code: 'KPI-04',
    name: 'Mean Time Between Failures',
    category: 'Reliability',
    unit: 'days',
    defaultAmber: 30,
    defaultRed: 14,
    higherIsWorse: false,
  },
  {
    code: 'KPI-05',
    name: 'SLA Compliance Rate',
    category: 'SLA',
    unit: '%',
    defaultAmber: 90,
    defaultRed: 80,
    higherIsWorse: false,
  },
  {
    code: 'KPI-06',
    name: 'Labour Utilisation Rate',
    category: 'Labour',
    unit: '%',
    defaultAmber: 70,
    defaultRed: 50,
    higherIsWorse: false,
  },
  {
    code: 'KPI-07',
    name: 'Parts Availability Rate',
    category: 'Inventory',
    unit: '%',
    defaultAmber: 85,
    defaultRed: 75,
    higherIsWorse: false,
  },
  {
    code: 'KPI-08',
    name: 'Fuel Efficiency Index',
    category: 'Fuel',
    unit: '%',
    defaultAmber: 115,
    defaultRed: 130,
    higherIsWorse: true,
  },
  {
    code: 'KPI-09',
    name: 'Procurement Lead Time',
    category: 'Procurement',
    unit: 'days',
    defaultAmber: 5,
    defaultRed: 10,
    higherIsWorse: true,
  },
  {
    code: 'KPI-10',
    name: 'Cost Per Kilometre',
    category: 'Cost',
    unit: 'currency',
    defaultAmber: 0,
    defaultRed: 0,
    higherIsWorse: true,
  },
];

// GET /api/kpi/compute - Compute KPIs from current data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || new Date().toISOString().split('T')[0];
    
    const results: Array<{
      kpiCode: string;
      kpiName: string;
      category: string;
      value: number;
      unit: string;
      flag: string;
      amberThreshold: number;
      redThreshold: number;
      details: Record<string, unknown>;
    }> = [];

    for (const config of KPI_CONFIGS) {
      let value = 0;
      let details: Record<string, unknown> = {};

      switch (config.code) {
        case 'KPI-01': {
          // Fleet Availability Rate
          const [totalAssets, assetsWithOpenJC] = await Promise.all([
            db.asset.count({ where: { isActive: true } }),
            db.asset.count({
              where: {
                isActive: true,
                jobCards: {
                  some: {
                    status: { in: ['IN_PROGRESS', 'ON_HOLD'] },
                    jobType: { in: ['CORRECTIVE', 'BREAKDOWN'] },
                  },
                },
              },
            }),
          ]);
          value = totalAssets > 0 ? ((totalAssets - assetsWithOpenJC) / totalAssets) * 100 : 100;
          details = { totalAssets, assetsWithOpenJC, availableAssets: totalAssets - assetsWithOpenJC };
          break;
        }

        case 'KPI-02': {
          // PM Compliance Rate
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const [completedPMs, totalPMs] = await Promise.all([
            db.pmExecution.count({
              where: {
                status: 'COMPLETED',
                completedAt: { gte: startOfMonth, lte: now },
              },
            }),
            db.pmExecution.count({
              where: {
                scheduledDate: { gte: startOfMonth, lte: now },
              },
            }),
          ]);
          value = totalPMs > 0 ? (completedPMs / totalPMs) * 100 : 100;
          details = { completedPMs, totalPMs, period: 'current_month' };
          break;
        }

        case 'KPI-03': {
          // Mean Time to Repair
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const completedJCs = await db.jobCard.findMany({
            where: {
              status: 'CLOSED',
              actualStart: { not: null },
              actualEnd: { gte: thirtyDaysAgo },
              jobType: { in: ['CORRECTIVE', 'BREAKDOWN'] },
            },
            select: { actualStart: true, actualEnd: true },
          });
          
          if (completedJCs.length > 0) {
            const totalHours = completedJCs.reduce((acc, jc) => {
              if (jc.actualStart && jc.actualEnd) {
                return acc + (jc.actualEnd.getTime() - jc.actualStart.getTime()) / (1000 * 60 * 60);
              }
              return acc;
            }, 0);
            value = totalHours / completedJCs.length;
          }
          details = { jobCardsAnalyzed: completedJCs.length, period: 'last_30_days' };
          break;
        }

        case 'KPI-05': {
          // SLA Compliance Rate
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const [metSLA, totalSLA] = await Promise.all([
            db.slaTracking.count({
              where: {
                status: 'MET',
                startedAt: { gte: thirtyDaysAgo },
              },
            }),
            db.slaTracking.count({
              where: {
                startedAt: { gte: thirtyDaysAgo },
                status: { in: ['MET', 'BREACH'] },
              },
            }),
          ]);
          value = totalSLA > 0 ? (metSLA / totalSLA) * 100 : 100;
          details = { metSLA, totalSLA, breachedSLA: totalSLA - metSLA };
          break;
        }

        case 'KPI-06': {
          // Labour Utilisation Rate
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const timeLogs = await db.timeLog.findMany({
            where: {
              logDate: { gte: thirtyDaysAgo },
              totalMinutes: { not: null },
            },
            select: { totalMinutes: true },
          });
          
          // Assume 8 hours per working day * 22 working days = 176 hours available
          const employees = await db.employee.count({ where: { status: 'ACTIVE' } });
          const availableHours = employees * 176; // ~22 working days in a month
          const billedMinutes = timeLogs.reduce((acc, log) => acc + (log.totalMinutes || 0), 0);
          const billedHours = billedMinutes / 60;
          
          value = availableHours > 0 ? (billedHours / availableHours) * 100 : 0;
          details = { billedHours: billedHours.toFixed(1), availableHours, activeEmployees: employees };
          break;
        }

        case 'KPI-07': {
          // Parts Availability Rate
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const [fulfilledMRs, totalMRs] = await Promise.all([
            db.materialRequest.count({
              where: {
                status: 'CLOSED',
                closedAt: { gte: thirtyDaysAgo },
              },
            }),
            db.materialRequest.count({
              where: {
                createdAt: { gte: thirtyDaysAgo },
              },
            }),
          ]);
          value = totalMRs > 0 ? (fulfilledMRs / totalMRs) * 100 : 100;
          details = { fulfilledMRs, totalMRs };
          break;
        }

        default:
          // Return simulated values for other KPIs not yet fully implemented
          value = config.defaultAmber;
          details = { note: 'Simulated value - full computation pending' };
      }

      // Determine flag based on thresholds
      let flag = 'GREEN';
      if (config.higherIsWorse) {
        if (value >= config.defaultRed) flag = 'RED';
        else if (value >= config.defaultAmber) flag = 'AMBER';
      } else {
        if (value <= config.defaultRed) flag = 'RED';
        else if (value <= config.defaultAmber) flag = 'AMBER';
      }

      results.push({
        kpiCode: config.code,
        kpiName: config.name,
        category: config.category,
        value: Number(value.toFixed(2)),
        unit: config.unit,
        flag,
        amberThreshold: config.defaultAmber,
        redThreshold: config.defaultRed,
        details,
      });
    }

    // Save snapshots
    for (const result of results) {
      await db.kpiSnapshot.create({
        data: {
          kpiCode: result.kpiCode,
          kpiName: result.kpiName,
          category: result.category,
          value: result.value,
          unit: result.unit,
          snapshotDate: new Date(period),
          period,
        },
      });
    }

    return NextResponse.json({
      data: results,
      computedAt: new Date().toISOString(),
      period,
    });
  } catch (error) {
    console.error('Error computing KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to compute KPIs' },
      { status: 500 }
    );
  }
}
