import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateInspectionSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  result: z.enum(['PASS', 'FAIL', 'CONDITIONAL']).optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  inspectorId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET - Get single inspection with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inspection = await db.qualityInspection.findUnique({
      where: { id },
      include: {
        inspector: {
          select: { id: true, name: true, email: true }
        },
        template: {
          select: { id: true, name: true, code: true }
        },
        checklistItems: {
          orderBy: { sequence: 'asc' }
        },
        defects: {
          include: {
            assignee: { select: { id: true, name: true } },
            correctiveActions: {
              include: {
                jobCard: { select: { id: true, jobCardNumber: true, status: true } },
                assignee: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Calculate completion stats
    const totalItems = inspection.checklistItems.length;
    const passedItems = inspection.checklistItems.filter(i => i.status === 'PASS').length;
    const failedItems = inspection.checklistItems.filter(i => i.status === 'FAIL').length;
    const naItems = inspection.checklistItems.filter(i => i.status === 'NA').length;
    const pendingItems = inspection.checklistItems.filter(i => i.status === 'PENDING').length;

    // Get entity details if available
    let entityDetails: any = null;
    if (inspection.entityId && inspection.entityType) {
      if (inspection.entityType === 'JOB_CARD') {
        entityDetails = await db.jobCard.findUnique({
          where: { id: inspection.entityId },
          select: { id: true, jobCardNumber: true, faultDescription: true, asset: { select: { id: true, assetNumber: true, name: true } } }
        });
      } else if (inspection.entityType === 'ASSET') {
        entityDetails = await db.asset.findUnique({
          where: { id: inspection.entityId },
          select: { id: true, assetNumber: true, name: true, status: true }
        });
      } else if (inspection.entityType === 'GRN') {
        entityDetails = await db.grnHeader.findUnique({
          where: { id: inspection.entityId },
          select: { id: true, grnNumber: true, supplier: { select: { id: true, name: true } } }
        });
      }
    }

    return NextResponse.json({
      ...inspection,
      completionStats: {
        total: totalItems,
        passed: passedItems,
        failed: failedItems,
        na: naItems,
        pending: pendingItems,
        percentage: totalItems > 0 ? Math.round(((passedItems + failedItems + naItems) / totalItems) * 100) : 0
      },
      entityDetails
    });

  } catch (error) {
    console.error('Error fetching inspection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    );
  }
}

// PATCH - Update inspection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateInspectionSchema.parse(body);

    // Get current inspection
    const currentInspection = await db.qualityInspection.findUnique({
      where: { id },
      include: {
        checklistItems: true,
        defects: true
      }
    });

    if (!currentInspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'SCHEDULED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'FAILED', 'SCHEDULED'],
      'COMPLETED': [],
      'FAILED': [],
      'CANCELLED': ['SCHEDULED']
    };

    if (data.status && !validTransitions[currentInspection.status]?.includes(data.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentInspection.status} to ${data.status}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.status) {
      updateData.status = data.status;

      // Auto-set startedAt when moving to IN_PROGRESS
      if (data.status === 'IN_PROGRESS' && !currentInspection.startedAt) {
        updateData.startedAt = new Date();
      }

      // Auto-set completedAt when moving to COMPLETED or FAILED
      if ((data.status === 'COMPLETED' || data.status === 'FAILED') && !currentInspection.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    if (data.result !== undefined) updateData.result = data.result;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    if (data.inspectorId !== undefined) updateData.inspectorId = data.inspectorId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Calculate pass/fail counts if completing
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      const passCount = currentInspection.checklistItems.filter(i => i.status === 'PASS').length;
      const failCount = currentInspection.checklistItems.filter(i => i.status === 'FAIL').length;
      const naCount = currentInspection.checklistItems.filter(i => i.status === 'NA').length;

      updateData.passCount = passCount;
      updateData.failCount = failCount;
      updateData.naCount = naCount;

      // Auto-determine result if not provided
      if (!data.result) {
        const hasDefects = currentInspection.defects.length > 0;
        const criticalDefects = currentInspection.defects.filter(d => d.severity === 'CRITICAL').length;
        
        if (failCount === 0 && !hasDefects) {
          updateData.result = 'PASS';
        } else if (criticalDefects > 0 || failCount > 0) {
          updateData.result = 'FAIL';
        } else {
          updateData.result = 'CONDITIONAL';
        }
      }
    }

    const updatedInspection = await db.qualityInspection.update({
      where: { id },
      data: updateData,
      include: {
        inspector: { select: { id: true, name: true } },
        checklistItems: { orderBy: { sequence: 'asc' } },
        defects: true
      }
    });

    return NextResponse.json(updatedInspection);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating inspection:', error);
    return NextResponse.json(
      { error: 'Failed to update inspection' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete inspection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inspection = await db.qualityInspection.findUnique({
      where: { id }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of SCHEDULED or CANCELLED inspections
    if (!['SCHEDULED', 'CANCELLED'].includes(inspection.status)) {
      return NextResponse.json(
        { error: 'Can only delete scheduled or cancelled inspections' },
        { status: 400 }
      );
    }

    await db.qualityInspection.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting inspection:', error);
    return NextResponse.json(
      { error: 'Failed to delete inspection' },
      { status: 500 }
    );
  }
}
