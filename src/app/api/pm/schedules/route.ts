import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to serialize Decimal values
function serializeSchedule(schedule: Record<string, unknown>) {
  return {
    ...schedule,
    hourInterval: schedule.hourInterval instanceof Decimal ? schedule.hourInterval.toNumber() : schedule.hourInterval,
    lastOdometer: schedule.lastOdometer instanceof Decimal ? schedule.lastOdometer.toNumber() : schedule.lastOdometer,
    lastHours: schedule.lastHours instanceof Decimal ? schedule.lastHours.toNumber() : schedule.lastHours,
    nextDueKm: schedule.nextDueKm instanceof Decimal ? schedule.nextDueKm.toNumber() : schedule.nextDueKm,
    nextDueHours: schedule.nextDueHours instanceof Decimal ? schedule.nextDueHours.toNumber() : schedule.nextDueHours,
  };
}

// Generate a unique schedule number
async function generateScheduleNumber(): Promise<string> {
  const count = await db.pmSchedule.count();
  const year = new Date().getFullYear();
  return `PM-${year}-${String(count + 1).padStart(5, '0')}`;
}

// GET - List all PM schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');
    const upcoming = searchParams.get('upcoming') === 'true';
    const days = parseInt(searchParams.get('days') || '30');

    const where: Record<string, unknown> = { isActive: true };
    if (status) {
      where.status = status;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (upcoming) {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      where.nextExecutionAt = {
        gte: now,
        lte: futureDate
      };
    }

    const schedules = await db.pmSchedule.findMany({
      where,
      include: {
        asset: {
          include: {
            category: true
          }
        },
        template: {
          include: {
            _count: {
              select: { checklistItems: true }
            }
          }
        },
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { nextExecutionAt: 'asc' }
    });

    // Add overdue status and serialize
    const now = new Date();
    const schedulesWithStatus = schedules.map(schedule => ({
      ...serializeSchedule(schedule as unknown as Record<string, unknown>),
      isOverdue: schedule.nextExecutionAt && new Date(schedule.nextExecutionAt) < now
    }));

    return NextResponse.json(schedulesWithStatus);
  } catch (error) {
    console.error('Error fetching PM schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PM schedules' },
      { status: 500 }
    );
  }
}

// POST - Create a new PM schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      assetId,
      templateId,
      pmType,
      calendarInterval,
      kmInterval,
      hourInterval,
      leadDays,
      estimatedDuration,
      priority
    } = body;

    // Validate asset exists
    const asset = await db.asset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Get asset meters for initial readings
    const meters = await db.assetMeter.findMany({
      where: { assetId, isActive: true }
    });
    const odometerMeter = meters.find(m => m.meterType === 'ODOMETER');
    const hourMeter = meters.find(m => m.meterType === 'ENGINE_HOURS');

    // Calculate next execution date based on calendar interval
    let nextExecutionAt: Date | null = null;
    if (calendarInterval) {
      nextExecutionAt = new Date();
      nextExecutionAt.setDate(nextExecutionAt.getDate() + calendarInterval);
    }

    const scheduleNumber = await generateScheduleNumber();

    const schedule = await db.pmSchedule.create({
      data: {
        scheduleNumber,
        assetId,
        templateId: templateId || null,
        pmType: pmType || 'SCHEDULED',
        calendarInterval: calendarInterval || null,
        kmInterval: kmInterval || null,
        hourInterval: hourInterval ? new Decimal(hourInterval) : null,
        leadDays: leadDays || 7,
        lastOdometer: odometerMeter?.currentValue || null,
        lastHours: hourMeter?.currentValue || null,
        nextExecutionAt,
        nextDueKm: kmInterval && odometerMeter
          ? new Decimal(odometerMeter.currentValue.toNumber() + kmInterval)
          : null,
        nextDueHours: hourInterval && hourMeter
          ? new Decimal(hourMeter.currentValue.toNumber() + Number(hourInterval))
          : null,
        estimatedDuration: estimatedDuration || null,
        priority: priority || 'NORMAL',
        status: 'ACTIVE'
      },
      include: {
        asset: {
          include: { category: true }
        },
        template: true
      }
    });

    return NextResponse.json(serializeSchedule(schedule as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('Error creating PM schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create PM schedule' },
      { status: 500 }
    );
  }
}
