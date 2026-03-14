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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single PM schedule
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const schedule = await db.pmSchedule.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            category: true,
            meters: {
              where: { isActive: true }
            }
          }
        },
        template: {
          include: {
            checklistItems: {
              orderBy: { sequence: 'asc' }
            }
          }
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            _count: {
              select: { executionItems: true }
            }
          }
        }
      }
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Add overdue status
    const now = new Date();
    const scheduleWithStatus = {
      ...serializeSchedule(schedule as unknown as Record<string, unknown>),
      isOverdue: schedule.nextExecutionAt && new Date(schedule.nextExecutionAt) < now
    };

    return NextResponse.json(scheduleWithStatus);
  } catch (error) {
    console.error('Error fetching PM schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PM schedule' },
      { status: 500 }
    );
  }
}

// PUT - Update a PM schedule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      templateId,
      pmType,
      calendarInterval,
      kmInterval,
      hourInterval,
      leadDays,
      estimatedDuration,
      priority,
      status,
      pauseReason
    } = body;

    // Check if schedule exists
    const existingSchedule = await db.pmSchedule.findUnique({
      where: { id }
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      templateId: templateId || null,
      pmType,
      calendarInterval: calendarInterval || null,
      kmInterval: kmInterval || null,
      hourInterval: hourInterval ? new Decimal(hourInterval) : null,
      leadDays,
      estimatedDuration: estimatedDuration || null,
      priority,
      status
    };

    // Handle pause
    if (status === 'PAUSED') {
      updateData.pauseReason = pauseReason;
      updateData.pausedAt = new Date();
    } else if (status === 'ACTIVE' && existingSchedule.status === 'PAUSED') {
      updateData.pauseReason = null;
      updateData.pausedAt = null;
    }

    // Recalculate next execution if calendar interval changed
    if (calendarInterval && calendarInterval !== existingSchedule.calendarInterval) {
      const nextExecutionAt = new Date();
      nextExecutionAt.setDate(nextExecutionAt.getDate() + calendarInterval);
      updateData.nextExecutionAt = nextExecutionAt;
    }

    const schedule = await db.pmSchedule.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          include: { category: true }
        },
        template: true
      }
    });

    return NextResponse.json(serializeSchedule(schedule as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating PM schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update PM schedule' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a PM schedule (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check for pending executions
    const pendingExecutions = await db.pmExecution.count({
      where: {
        scheduleId: id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });

    if (pendingExecutions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete schedule with pending executions' },
        { status: 400 }
      );
    }

    // Soft delete
    await db.pmSchedule.update({
      where: { id },
      data: {
        isActive: false,
        status: 'CANCELLED'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PM schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete PM schedule' },
      { status: 500 }
    );
  }
}
