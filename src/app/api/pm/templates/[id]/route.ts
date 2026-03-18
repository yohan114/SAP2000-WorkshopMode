import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to serialize Decimal values
function serializeTemplate(template: Record<string, unknown>) {
  return {
    ...template,
    estimatedHours: template.estimatedHours instanceof Decimal ? template.estimatedHours.toNumber() : template.estimatedHours,
  };
}

// Helper to serialize checklist item
function serializeChecklistItem(item: Record<string, unknown>) {
  return {
    ...item,
    quantity: item.quantity instanceof Decimal ? item.quantity.toNumber() : item.quantity,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single PM template
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const template = await db.pmTemplate.findUnique({
      where: { id },
      include: {
        checklistItems: {
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { schedules: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Serialize
    const serialized = serializeTemplate(template as unknown as Record<string, unknown>);
    if (serialized.checklistItems) {
      serialized.checklistItems = serialized.checklistItems.map((item: Record<string, unknown>) => 
        serializeChecklistItem(item)
      );
    }

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error fetching PM template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PM template' },
      { status: 500 }
    );
  }
}

// PUT - Update a PM template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, assetCategory, description, estimatedHours, isActive, checklistItems } = body;

    // Check if template exists
    const existingTemplate = await db.pmTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name;
    if (assetCategory !== undefined) updateData.assetCategory = assetCategory;
    if (description !== undefined) updateData.description = description || null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours ? new Decimal(estimatedHours) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle checklist items update if provided
    if (checklistItems) {
      // Delete existing items and create new ones
      await db.pmChecklistItem.deleteMany({
        where: { templateId: id }
      });

      if (checklistItems.length > 0) {
        updateData.checklistItems = {
          create: checklistItems.map((item: Record<string, unknown>, index: number) => ({
            sequence: (item.sequence as number) || index + 1,
            itemType: item.itemType as string,
            description: item.description as string,
            partRequired: (item.partRequired as boolean) || false,
            partCode: (item.partCode as string) || null,
            quantity: item.quantity ? new Decimal(item.quantity as number) : null,
            unitOfMeasure: (item.unitOfMeasure as string) || null,
            isMandatory: item.isMandatory !== false,
            notes: (item.notes as string) || null
          }))
        };
      }
    }

    const template = await db.pmTemplate.update({
      where: { id },
      data: updateData,
      include: {
        checklistItems: {
          orderBy: { sequence: 'asc' }
        }
      }
    });

    // Serialize
    const serialized = serializeTemplate(template as unknown as Record<string, unknown>);
    if (serialized.checklistItems) {
      serialized.checklistItems = serialized.checklistItems.map((item: Record<string, unknown>) => 
        serializeChecklistItem(item)
      );
    }

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error updating PM template:', error);
    return NextResponse.json(
      { error: 'Failed to update PM template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a PM template (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if template is used by any active schedules
    const schedulesCount = await db.pmSchedule.count({
      where: {
        templateId: id,
        isActive: true
      }
    });

    if (schedulesCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is in use by active schedules' },
        { status: 400 }
      );
    }

    // Soft delete
    await db.pmTemplate.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PM template:', error);
    return NextResponse.json(
      { error: 'Failed to delete PM template' },
      { status: 500 }
    );
  }
}
