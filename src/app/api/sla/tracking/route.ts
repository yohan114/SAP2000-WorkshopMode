import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET /api/sla/tracking - List SLA tracking records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const status = searchParams.get('status');
    const slaType = searchParams.get('slaType');

    const where: Record<string, unknown> = {};
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (slaType) {
      where.slaType = slaType;
    }

    const [tracking, total] = await Promise.all([
      db.slaTracking.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.slaTracking.count({ where }),
    ]);

    // Add computed fields
    const enrichedTracking = tracking.map(t => {
      const now = new Date();
      const targetAt = t.targetAt;
      const isOverdue = !t.completedAt && targetAt < now;
      const timeRemaining = t.completedAt 
        ? 0 
        : Math.max(0, targetAt.getTime() - now.getTime()) / (1000 * 60 * 60); // hours

      return {
        ...t,
        isOverdue,
        timeRemaining: Number(timeRemaining.toFixed(2)),
        duration: t.completedAt
          ? (t.completedAt.getTime() - t.startedAt.getTime()) / (1000 * 60 * 60) // hours
          : (now.getTime() - t.startedAt.getTime()) / (1000 * 60 * 60),
      };
    });

    return NextResponse.json({
      data: enrichedTracking,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching SLA tracking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SLA tracking' },
      { status: 500 }
    );
  }
}

// POST /api/sla/tracking - Create SLA tracking record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      entityType: z.enum(['JOB_CARD', 'MATERIAL_REQUEST', 'PURCHASE_ORDER']),
      entityId: z.string().min(1),
      slaType: z.string().min(1),
      targetAt: z.string(),
    });
    
    const validatedData = schema.parse(body);

    // Check if already tracking
    const existing = await db.slaTracking.findFirst({
      where: {
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        slaType: validatedData.slaType,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'SLA tracking already exists for this entity' },
        { status: 400 }
      );
    }

    const tracking = await db.slaTracking.create({
      data: {
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        slaType: validatedData.slaType,
        targetAt: new Date(validatedData.targetAt),
      },
    });

    return NextResponse.json(tracking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating SLA tracking:', error);
    return NextResponse.json(
      { error: 'Failed to create SLA tracking' },
      { status: 500 }
    );
  }
}

// PUT /api/sla/tracking - Update SLA tracking (respond/complete)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      id: z.string().min(1),
      action: z.enum(['RESPOND', 'COMPLETE', 'WAIVE', 'BREACH']),
      reason: z.string().optional(),
      approvedBy: z.string().optional(),
    });
    
    const validatedData = schema.parse(body);

    const tracking = await db.slaTracking.findUnique({
      where: { id: validatedData.id },
    });

    if (!tracking) {
      return NextResponse.json(
        { error: 'SLA tracking record not found' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (validatedData.action) {
      case 'RESPOND':
        updateData = { respondedAt: new Date() };
        break;
      case 'COMPLETE':
        updateData = { 
          completedAt: new Date(),
          status: tracking.targetAt > new Date() ? 'MET' : 'BREACH',
        };
        break;
      case 'WAIVE':
        if (!validatedData.reason || !validatedData.approvedBy) {
          return NextResponse.json(
            { error: 'Waiver reason and approval required' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'WAIVED',
          waiverReason: validatedData.reason,
          waiverApprovedBy: validatedData.approvedBy,
        };
        break;
      case 'BREACH':
        updateData = {
          status: 'BREACH',
          breachReason: validatedData.reason,
        };
        break;
    }

    const updated = await db.slaTracking.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating SLA tracking:', error);
    return NextResponse.json(
      { error: 'Failed to update SLA tracking' },
      { status: 500 }
    );
  }
}
