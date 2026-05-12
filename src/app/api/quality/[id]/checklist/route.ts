import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateChecklistItemSchema = z.object({
  itemId: z.string(),
  status: z.enum(['PENDING', 'PASS', 'FAIL', 'NA']),
  actualResult: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// PATCH - Update a checklist item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateChecklistItemSchema.parse(body);
    const { itemId } = data;

    // Verify inspection exists and is in progress
    const inspection = await db.qualityInspection.findUnique({
      where: { id },
      include: { checklistItems: true }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Allow updates for SCHEDULED (auto-start) or IN_PROGRESS
    if (inspection.status === 'SCHEDULED') {
      // Auto-start the inspection
      await db.qualityInspection.update({
        where: { id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() }
      });
    } else if (!['IN_PROGRESS'].includes(inspection.status)) {
      return NextResponse.json(
        { error: 'Can only update checklist items for in-progress inspections' },
        { status: 400 }
      );
    }

    // Update the checklist item
    const updatedItem = await db.qualityChecklistItem.update({
      where: { id: itemId },
      data: {
        status: data.status,
        actualResult: data.actualResult || null,
        remarks: data.remarks || null,
        checkedAt: new Date()
      }
    });

    // Update inspection counts
    const allItems = await db.qualityChecklistItem.findMany({
      where: { inspectionId: id }
    });

    const passCount = allItems.filter(i => i.status === 'PASS').length;
    const failCount = allItems.filter(i => i.status === 'FAIL').length;
    const naCount = allItems.filter(i => i.status === 'NA').length;

    await db.qualityInspection.update({
      where: { id },
      data: { passCount, failCount, naCount }
    });

    return NextResponse.json(updatedItem);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    );
  }
}

// POST - Add a new checklist item to inspection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { criterion, expectedResult, isMandatory } = body;

    if (!criterion) {
      return NextResponse.json(
        { error: 'Criterion is required' },
        { status: 400 }
      );
    }

    // Verify inspection exists and is in progress
    const inspection = await db.qualityInspection.findUnique({
      where: { id },
      include: { checklistItems: true }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    if (!['IN_PROGRESS', 'SCHEDULED'].includes(inspection.status)) {
      return NextResponse.json(
        { error: 'Can only add items to scheduled or in-progress inspections' },
        { status: 400 }
      );
    }

    // Get next sequence number
    const maxSequence = Math.max(
      0,
      ...inspection.checklistItems.map(i => i.sequence)
    );

    const newItem = await db.qualityChecklistItem.create({
      data: {
        inspectionId: id,
        criterion,
        expectedResult: expectedResult || null,
        isMandatory: isMandatory !== false,
        sequence: maxSequence + 1,
        status: 'PENDING'
      }
    });

    return NextResponse.json(newItem, { status: 201 });

  } catch (error) {
    console.error('Error adding checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to add checklist item' },
      { status: 500 }
    );
  }
}
