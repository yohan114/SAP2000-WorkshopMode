import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateDefectSchema = z.object({
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION']).optional(),
  defectCode: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED']).optional(),
  assignedToId: z.string().optional().nullable(),
  resolutionNotes: z.string().optional().nullable(),
  verificationNotes: z.string().optional().nullable(),
});

// PATCH - Update a defect
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
) {
  try {
    const { defectId } = await params;
    const body = await request.json();
    const data = updateDefectSchema.parse(body);

    const defect = await db.qualityDefect.findUnique({
      where: { id: defectId },
      include: { inspection: true }
    });

    if (!defect) {
      return NextResponse.json(
        { error: 'Defect not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'OPEN': ['IN_PROGRESS', 'RESOLVED'],
      'IN_PROGRESS': ['RESOLVED', 'OPEN'],
      'RESOLVED': ['VERIFIED', 'IN_PROGRESS'],
      'VERIFIED': ['CLOSED', 'RESOLVED'],
      'CLOSED': []
    };

    if (data.status && !validTransitions[defect.status]?.includes(data.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${defect.status} to ${data.status}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.severity) updateData.severity = data.severity;
    if (data.defectCode !== undefined) updateData.defectCode = data.defectCode;
    if (data.description) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status) {
      updateData.status = data.status;
      
      // Auto-set resolvedAt when status becomes RESOLVED
      if (data.status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
      
      // Auto-set verifiedAt when status becomes VERIFIED
      if (data.status === 'VERIFIED') {
        updateData.verifiedAt = new Date();
      }
    }
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.resolutionNotes !== undefined) updateData.resolutionNotes = data.resolutionNotes;
    if (data.verificationNotes !== undefined) updateData.verificationNotes = data.verificationNotes;

    const updatedDefect = await db.qualityDefect.update({
      where: { id: defectId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true } },
        correctiveActions: {
          include: {
            jobCard: { select: { id: true, jobCardNumber: true, status: true } },
            assignee: { select: { id: true, name: true } }
          }
        }
      }
    });

    return NextResponse.json(updatedDefect);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating defect:', error);
    return NextResponse.json(
      { error: 'Failed to update defect' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a defect
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
) {
  try {
    const { defectId } = await params;

    const defect = await db.qualityDefect.findUnique({
      where: { id: defectId },
      include: { correctiveActions: true }
    });

    if (!defect) {
      return NextResponse.json(
        { error: 'Defect not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion if there are corrective actions
    if (defect.correctiveActions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete defect with associated corrective actions' },
        { status: 400 }
      );
    }

    await db.qualityDefect.delete({
      where: { id: defectId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting defect:', error);
    return NextResponse.json(
      { error: 'Failed to delete defect' },
      { status: 500 }
    );
  }
}
