import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for updating a saved report
const updateSavedReportSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  filters: z.record(z.string(), z.any()).optional(),
  schedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().nullable(),
  recipients: z.array(z.string().email()).optional().nullable(),
  format: z.enum(['PDF', 'EXCEL', 'CSV']).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/reports/saved/[id] - Get a single saved report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const savedReport = await db.savedReport.findUnique({
      where: { id },
    });

    if (!savedReport) {
      return NextResponse.json(
        { error: 'Saved report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...savedReport,
      filters: JSON.parse(savedReport.filters),
      recipients: savedReport.recipients ? JSON.parse(savedReport.recipients) : null,
    });
  } catch (error) {
    console.error('Failed to fetch saved report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved report' },
      { status: 500 }
    );
  }
}

// PUT /api/reports/saved/[id] - Update a saved report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateSavedReportSchema.parse(body);

    // Check if report exists
    const existing = await db.savedReport.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved report not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validated.name) updateData.name = validated.name;
    if (validated.filters) updateData.filters = JSON.stringify(validated.filters);
    if (validated.format) updateData.format = validated.format;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    
    if (validated.recipients !== undefined) {
      updateData.recipients = validated.recipients ? JSON.stringify(validated.recipients) : null;
    }
    
    // Handle schedule changes
    if (validated.schedule !== undefined) {
      updateData.schedule = validated.schedule || null;
      
      // Recalculate nextRunAt if schedule changed
      if (validated.schedule) {
        const now = new Date();
        switch (validated.schedule) {
          case 'DAILY':
            updateData.nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'WEEKLY':
            updateData.nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'MONTHLY':
            updateData.nextRunAt = new Date(now.setMonth(now.getMonth() + 1));
            break;
        }
      } else {
        updateData.nextRunAt = null;
      }
    }

    const updatedReport = await db.savedReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updatedReport,
      filters: JSON.parse(updatedReport.filters),
      recipients: updatedReport.recipients ? JSON.parse(updatedReport.recipients) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update saved report:', error);
    return NextResponse.json(
      { error: 'Failed to update saved report' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/saved/[id] - Delete a saved report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if report exists
    const existing = await db.savedReport.findUnique({
      where: { id },
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
