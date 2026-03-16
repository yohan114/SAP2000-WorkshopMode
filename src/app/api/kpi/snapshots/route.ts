import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// KPI definitions
const KPI_DEFINITIONS = [
  { code: 'KPI-01', name: 'Fleet Availability Rate', category: 'Fleet', unit: '%', higherIsWorse: false },
  { code: 'KPI-02', name: 'PM Compliance Rate', category: 'PM', unit: '%', higherIsWorse: false },
  { code: 'KPI-03', name: 'Mean Time to Repair (MTTR)', category: 'Efficiency', unit: 'hours', higherIsWorse: true },
  { code: 'KPI-04', name: 'Mean Time Between Failures', category: 'Reliability', unit: 'days', higherIsWorse: false },
  { code: 'KPI-05', name: 'SLA Compliance Rate', category: 'SLA', unit: '%', higherIsWorse: false },
  { code: 'KPI-06', name: 'Labour Utilisation Rate', category: 'Labour', unit: '%', higherIsWorse: false },
  { code: 'KPI-07', name: 'Parts Availability Rate', category: 'Inventory', unit: '%', higherIsWorse: false },
  { code: 'KPI-08', name: 'Fuel Efficiency Index', category: 'Fuel', unit: '%', higherIsWorse: true },
  { code: 'KPI-09', name: 'Procurement Lead Time', category: 'Procurement', unit: 'days', higherIsWorse: true },
  { code: 'KPI-10', name: 'Cost Per Kilometre', category: 'Cost', unit: 'currency', higherIsWorse: true },
];

// GET /api/kpi/snapshots - List KPI snapshots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const kpiCode = searchParams.get('kpiCode');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period');

    const where: Record<string, unknown> = {};
    
    if (kpiCode) {
      where.kpiCode = kpiCode;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (period) {
      where.period = period;
    }
    
    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) {
        (where.snapshotDate as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.snapshotDate as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [snapshots, total] = await Promise.all([
      db.kpiSnapshot.findMany({
        where,
        orderBy: [{ snapshotDate: 'desc' }, { kpiCode: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.kpiSnapshot.count({ where }),
    ]);

    // Get threshold configs for flag computation
    const configs = await db.kpiThresholdConfig.findMany({
      where: { isActive: true },
    });
    const configMap = new Map(configs.map(c => [c.kpiCode, c]));

    // Add computed flags to snapshots
    const enrichedSnapshots = snapshots.map(snapshot => {
      const config = configMap.get(snapshot.kpiCode);
      let flag = 'GREEN';
      
      if (config) {
        const value = Number(snapshot.value);
        const amberThreshold = Number(config.amberThreshold);
        const redThreshold = Number(config.redThreshold);
        
        if (config.higherIsWorse) {
          // Higher values are worse (e.g., MTTR)
          if (value >= redThreshold) flag = 'RED';
          else if (value >= amberThreshold) flag = 'AMBER';
        } else {
          // Lower values are worse (e.g., Compliance %)
          if (value <= redThreshold) flag = 'RED';
          else if (value <= amberThreshold) flag = 'AMBER';
        }
      }
      
      return {
        ...snapshot,
        flag,
        value: Number(snapshot.value),
        target: snapshot.target ? Number(snapshot.target) : null,
      };
    });

    return NextResponse.json({
      data: enrichedSnapshots,
      kpiDefinitions: KPI_DEFINITIONS,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching KPI snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI snapshots' },
      { status: 500 }
    );
  }
}

// POST /api/kpi/snapshots - Create a KPI snapshot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      kpiCode: z.string().min(1),
      kpiName: z.string().min(1),
      category: z.string().min(1),
      value: z.number(),
      target: z.number().optional(),
      unit: z.string().optional(),
      snapshotDate: z.string(),
      period: z.string().optional(),
    });
    
    const validatedData = schema.parse(body);

    const snapshot = await db.kpiSnapshot.create({
      data: {
        kpiCode: validatedData.kpiCode,
        kpiName: validatedData.kpiName,
        category: validatedData.category,
        value: validatedData.value,
        target: validatedData.target,
        unit: validatedData.unit,
        snapshotDate: new Date(validatedData.snapshotDate),
        period: validatedData.period,
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating KPI snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create KPI snapshot' },
      { status: 500 }
    );
  }
}
