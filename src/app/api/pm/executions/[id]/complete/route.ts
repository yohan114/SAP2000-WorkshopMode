import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to serialize Decimal values
function serializeExecution(execution: Record<string, unknown>) {
  return {
    ...execution,
    odometerReading: execution.odometerReading instanceof Decimal ? execution.odometerReading.toNumber() : execution.odometerReading,
    hourReading: execution.hourReading instanceof Decimal ? execution.hourReading.toNumber() : execution.hourReading,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Complete a PM execution
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      executionDate,
      odometerReading,
      hourReading,
      downtimeMinutes,
      technicianNotes,
      supervisorNotes,
      executionItems
    } = body;

    // Get execution with schedule
    const execution = await db.pmExecution.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            asset: true
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    if (execution.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Execution already completed' },
        { status: 400 }
      );
    }

    // Count failed items
    const failCount = executionItems?.filter((item: Record<string, unknown>) =>
      item.status === 'FAIL'
    ).length || 0;

    // Update execution items
    if (executionItems && Array.isArray(executionItems)) {
      for (const item of executionItems) {
        await db.pmExecutionItem.update({
          where: { id: item.id as string },
          data: {
            status: item.status as string,
            measuredValue: item.measuredValue as string || null,
            notes: item.notes as string || null,
            completedAt: new Date()
          }
        });
      }
    }

    // Update execution
    const completedExecution = await db.pmExecution.update({
      where: { id },
      data: {
        executionDate: executionDate ? new Date(executionDate) : new Date(),
        completedAt: new Date(),
        status: 'COMPLETED',
        odometerReading: odometerReading ? new Decimal(odometerReading) : null,
        hourReading: hourReading ? new Decimal(hourReading) : null,
        downtimeMinutes: downtimeMinutes || null,
        technicianNotes: technicianNotes || null,
        supervisorNotes: supervisorNotes || null,
        failItemsCount: failCount
      },
      include: {
        schedule: {
          include: {
            asset: true
          }
        }
      }
    });

    // Update schedule's last execution data and calculate next due
    const schedule = execution.schedule;
    const updateData: Record<string, unknown> = {
      lastExecutedAt: new Date(),
      lastOdometer: odometerReading ? new Decimal(odometerReading) : schedule.lastOdometer,
      lastHours: hourReading ? new Decimal(hourReading) : schedule.lastHours
    };

    // Calculate next execution date based on calendar interval
    if (schedule.calendarInterval) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + schedule.calendarInterval);
      updateData.nextExecutionAt = nextDate;
    }

    // Calculate next due KM
    if (schedule.kmInterval && odometerReading) {
      updateData.nextDueKm = new Decimal(Number(odometerReading) + schedule.kmInterval);
    }

    // Calculate next due hours
    if (schedule.hourInterval && hourReading) {
      const hourIntervalValue = schedule.hourInterval instanceof Decimal 
        ? schedule.hourInterval.toNumber() 
        : Number(schedule.hourInterval);
      updateData.nextDueHours = new Decimal(Number(hourReading) + hourIntervalValue);
    }

    // Update asset meters if readings provided
    if (odometerReading && schedule.asset) {
      const odometerMeter = await db.assetMeter.findFirst({
        where: { assetId: schedule.assetId, meterType: 'ODOMETER', isActive: true }
      });
      if (odometerMeter) {
        await db.assetMeter.update({
          where: { id: odometerMeter.id },
          data: {
            currentValue: new Decimal(odometerReading),
            lastReadingAt: new Date()
          }
        });
        await db.meterReading.create({
          data: {
            meterId: odometerMeter.id,
            readingValue: new Decimal(odometerReading),
            readingSource: 'PM_EXECUTION'
          }
        });
      }
    }

    if (hourReading && schedule.asset) {
      const hourMeter = await db.assetMeter.findFirst({
        where: { assetId: schedule.assetId, meterType: 'ENGINE_HOURS', isActive: true }
      });
      if (hourMeter) {
        await db.assetMeter.update({
          where: { id: hourMeter.id },
          data: {
            currentValue: new Decimal(hourReading),
            lastReadingAt: new Date()
          }
        });
        await db.meterReading.create({
          data: {
            meterId: hourMeter.id,
            readingValue: new Decimal(hourReading),
            readingSource: 'PM_EXECUTION'
          }
        });
      }
    }

    // Update schedule
    await db.pmSchedule.update({
      where: { id: schedule.id },
      data: updateData
    });

    return NextResponse.json(serializeExecution(completedExecution as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error completing PM execution:', error);
    return NextResponse.json(
      { error: 'Failed to complete PM execution' },
      { status: 500 }
    );
  }
}
