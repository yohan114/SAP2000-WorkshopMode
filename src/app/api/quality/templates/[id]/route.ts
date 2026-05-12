import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    criterion: z.string(),
    expectedResult: z.string().optional().nullable(),
    isMandatory: z.boolean().default(true),
    scoringMethod: z.enum(['PASS_FAIL', 'SCORE', 'YES_NO']).default('PASS_FAIL'),
    maxScore: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
});

// GET - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await db.qualityTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { inspections: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);

  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateTemplateSchema.parse(body);

    const template = await db.qualityTemplate.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Update basic fields
    const updateData: Record<string, unknown> = {
      version: { increment: 1 }
    };

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update items if provided
    if (data.items) {
      // Delete existing items
      await db.qualityTemplateItem.deleteMany({
        where: { templateId: id }
      });

      // Create new items
      await db.qualityTemplateItem.createMany({
        data: data.items.map((item, index) => ({
          templateId: id,
          criterion: item.criterion,
          expectedResult: item.expectedResult || null,
          isMandatory: item.isMandatory,
          scoringMethod: item.scoringMethod,
          maxScore: item.maxScore || null,
          notes: item.notes || null,
          sequence: index + 1
        }))
      });
    }

    const updatedTemplate = await db.qualityTemplate.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sequence: 'asc' } }
      }
    });

    return NextResponse.json(updatedTemplate);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await db.qualityTemplate.findUnique({
      where: { id },
      include: { _count: { select: { inspections: true } } }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is in use
    if (template._count.inspections > 0) {
      // Soft delete
      await db.qualityTemplate.update({
        where: { id },
        data: { isActive: false }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Template deactivated (in use by existing inspections)' 
      });
    }

    // Hard delete if not in use
    await db.qualityTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
