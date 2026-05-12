import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to serialize Decimal values
function serializeTemplate(template: Record<string, unknown>): any {
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

// GET - List all PM templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetCategory = searchParams.get('assetCategory');
    const includeItems = searchParams.get('includeItems') === 'true';

    const where: Record<string, unknown> = { isActive: true };
    if (assetCategory) {
      where.assetCategory = assetCategory;
    }

    const templates = await db.pmTemplate.findMany({
      where,
      include: includeItems ? {
        checklistItems: {
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { schedules: true, checklistItems: true }
        }
      } : {
        _count: {
          select: { schedules: true, checklistItems: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Serialize templates
    const serializedTemplates = templates.map(template => {
      const serialized = serializeTemplate(template as unknown as Record<string, unknown>);
      if (serialized.checklistItems) {
        serialized.checklistItems = serialized.checklistItems.map((item: Record<string, unknown>) => 
          serializeChecklistItem(item)
        );
      }
      return serialized;
    });

    return NextResponse.json(serializedTemplates);
  } catch (error) {
    console.error('Error fetching PM templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PM templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new PM template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, assetCategory, description, estimatedHours, checklistItems } = body;

    // Check if code already exists
    const existingTemplate = await db.pmTemplate.findUnique({
      where: { code }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template code already exists' },
        { status: 400 }
      );
    }

    // Create template with checklist items
    const template = await db.pmTemplate.create({
      data: {
        code,
        name,
        assetCategory,
        description: description || null,
        estimatedHours: estimatedHours ? new Decimal(estimatedHours) : null,
        checklistItems: checklistItems && checklistItems.length > 0 ? {
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
        } : undefined
      },
      include: {
        checklistItems: {
          orderBy: { sequence: 'asc' }
        }
      }
    });

    // Serialize and return
    const serialized = serializeTemplate(template as unknown as Record<string, unknown>);
    if (serialized.checklistItems) {
      serialized.checklistItems = serialized.checklistItems.map((item: Record<string, unknown>) => 
        serializeChecklistItem(item)
      );
    }

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error('Error creating PM template:', error);
    return NextResponse.json(
      { error: 'Failed to create PM template' },
      { status: 500 }
    );
  }
}
