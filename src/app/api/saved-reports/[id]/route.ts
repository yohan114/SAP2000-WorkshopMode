import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/saved-reports/[id] - Get a single saved report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const savedReport = await db.savedReport.findFirst({
      where: {
        id,
        createdBy: session.user.id,
      },
    });

    if (!savedReport) {
      return NextResponse.json(
        { error: 'Saved report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...savedReport,
        filters: JSON.parse(savedReport.filters),
        recipients: savedReport.recipients ? JSON.parse(savedReport.recipients) : [],
      },
    });
  } catch (error) {
    console.error('Failed to fetch saved report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved report' },
      { status: 500 }
    );
  }
}

// PUT /api/saved-reports/[id] - Update a saved report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      reportType,
      filters,
      schedule,
      recipients,
      format,
      isActive,
    } = body;

    // Check if report exists and belongs to user
    const existing = await db.savedReport.findFirst({
      where: { id, createdBy: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved report not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name;
    if (reportType !== undefined) updateData.reportType = reportType;
    if (filters !== undefined) updateData.filters = JSON.stringify(filters);
    if (format !== undefined) updateData.format = format;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (recipients !== undefined) {
      updateData.recipients = recipients ? JSON.stringify(recipients) : null;
    }
    
    if (schedule !== undefined) {
      updateData.schedule = schedule;
      if (schedule) {
        updateData.nextRunAt = calculateNextRun(schedule);
      } else {
        updateData.nextRunAt = null;
      }
    }

    const updated = await db.savedReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        filters: JSON.parse(updated.filters),
        recipients: updated.recipients ? JSON.parse(updated.recipients) : [],
      },
    });
  } catch (error) {
    console.error('Failed to update saved report:', error);
    return NextResponse.json(
      { error: 'Failed to update saved report' },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-reports/[id] - Delete a saved report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if report exists and belongs to user
    const existing = await db.savedReport.findFirst({
      where: { id, createdBy: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved report not found' },
        { status: 404 }
      );
    }

    await db.savedReport.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Saved report deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete saved report:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved report' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run date
function calculateNextRun(schedule: string): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  
  switch (schedule) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
  }
  
  return next;
}
