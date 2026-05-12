import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET /api/kpi/thresholds - List KPI threshold configs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = { isActive: true };
    if (category) {
      where.category = category;
    }

    const thresholds = await db.kpiThresholdConfig.findMany({
      where,
      orderBy: { kpiCode: 'asc' },
    });

    return NextResponse.json({
      data: thresholds.map(t => ({
        ...t,
        amberThreshold: Number(t.amberThreshold),
        redThreshold: Number(t.redThreshold),
      })),
    });
  } catch (error) {
    console.error('Error fetching KPI thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI thresholds' },
      { status: 500 }
    );
  }
}

// POST /api/kpi/thresholds - Create/update KPI threshold config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      kpiCode: z.string().min(1),
      kpiName: z.string().min(1),
      category: z.string().min(1),
      amberThreshold: z.number(),
      redThreshold: z.number(),
      higherIsWorse: z.boolean().default(false),
      unit: z.string().optional(),
      description: z.string().optional(),
    });
    
    const validatedData = schema.parse(body);

    const threshold = await db.kpiThresholdConfig.upsert({
      where: { kpiCode: validatedData.kpiCode },
      create: validatedData,
      update: {
        kpiName: validatedData.kpiName,
        category: validatedData.category,
        amberThreshold: validatedData.amberThreshold,
        redThreshold: validatedData.redThreshold,
        higherIsWorse: validatedData.higherIsWorse,
        unit: validatedData.unit,
        description: validatedData.description,
      },
    });

    return NextResponse.json({
      ...threshold,
      amberThreshold: Number(threshold.amberThreshold),
      redThreshold: Number(threshold.redThreshold),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating KPI threshold:', error);
    return NextResponse.json(
      { error: 'Failed to create KPI threshold' },
      { status: 500 }
    );
  }
}
