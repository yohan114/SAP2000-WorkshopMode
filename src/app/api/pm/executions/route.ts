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

// Generate a unique execution number
async function generateExecutionNumber(): Promise<string> {
  const count = await db.pmExecution.count();
  const year = new Date().getFullYear();
  return `PME-${year}-${String(count + 1).padStart(5, '0')}`;
}

// GET - List all PM executions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const scheduleId = searchParams.get('scheduleId');
    const assetId = searchParams.get('assetId');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (scheduleId) {
      where.scheduleId = scheduleId;
    }
    if (assetId) {
      where.schedule = { assetId };
    }

    const executions = await db.pmExecution.findMany({
      where,
      include: {
        schedule: {
          include: {
            asset: {
              include: { category: true }
            },
            template: true
          }
        },
        _count: {
          select: { executionItems: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Serialize executions
    const serializedExecutions = executions.map(execution => ({
      ...serializeExecution(execution as unknown as Record<string, unknown>),
      totalItems: execution._count?.executionItems || 0
    }));

    return NextResponse.json(serializedExecutions);
  } catch (error) {
    console.error('Error fetching PM executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PM executions' },
      { status: 500 }
    );
  }
}

// POST - Create a new PM execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, scheduledDate } = body;

    // Validate schedule exists and is active
    const schedule = await db.pmSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        template: {
          include: {
            checklistItems: {
              orderBy: { sequence: 'asc' }
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

    if (schedule.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Schedule is not active' },
        { status: 400 }
      );
    }

    // Check for existing pending execution
    const existingExecution = await db.pmExecution.findFirst({
      where: {
        scheduleId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });

    if (existingExecution) {
      return NextResponse.json(
        { error: 'A pending execution already exists for this schedule' },
        { status: 400 }
      );
    }

    const executionNumber = await generateExecutionNumber();

    // Create execution with checklist items from template
    const execution = await db.pmExecution.create({
      data: {
        executionNumber,
        scheduleId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : schedule.nextExecutionAt,
        status: 'SCHEDULED',
        executionItems: schedule.template?.checklistItems && schedule.template.checklistItems.length > 0
          ? {
              create: schedule.template.checklistItems.map(item => ({
                checklistItemId: item.id,
                status: 'PENDING'
              }))
            }
          : undefined
      },
      include: {
        schedule: {
          include: {
            asset: {
              include: { category: true }
            }
          }
        },
        executionItems: {
          include: {
            checklistItem: true
          }
        }
      }
    });

    return NextResponse.json(serializeExecution(execution as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('Error creating PM execution:', error);
    return NextResponse.json(
      { error: 'Failed to create PM execution' },
      { status: 500 }
    );
  }
}
