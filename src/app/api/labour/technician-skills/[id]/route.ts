import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for technician skill update
const technicianSkillUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED']).optional(),
  awardedDate: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  certificateUrl: z.string().nullable().optional(),
  trainingRef: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/labour/technician-skills/[id] - Get single technician skill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const technicianSkill = await db.technicianSkill.findUnique({
      where: { id },
      include: {
        employee: true,
        skill: true,
      },
    });

    if (!technicianSkill) {
      return NextResponse.json({ error: 'Technician skill not found' }, { status: 404 });
    }

    return NextResponse.json(technicianSkill);
  } catch (error) {
    console.error('Error fetching technician skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technician skill' },
      { status: 500 }
    );
  }
}

// PUT /api/labour/technician-skills/[id] - Update technician skill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = technicianSkillUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.awardedDate) updateData.awardedDate = new Date(validatedData.awardedDate);
    if (validatedData.expiryDate !== undefined) {
      updateData.expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null;
    }
    if (validatedData.certificateUrl !== undefined) updateData.certificateUrl = validatedData.certificateUrl;
    if (validatedData.trainingRef !== undefined) updateData.trainingRef = validatedData.trainingRef;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    const technicianSkill = await db.technicianSkill.update({
      where: { id },
      data: updateData,
      include: {
        employee: true,
        skill: true,
      },
    });

    return NextResponse.json(technicianSkill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating technician skill:', error);
    return NextResponse.json(
      { error: 'Failed to update technician skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/labour/technician-skills/[id] - Remove skill from technician
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.technicianSkill.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Technician skill removed successfully' });
  } catch (error) {
    console.error('Error deleting technician skill:', error);
    return NextResponse.json(
      { error: 'Failed to remove technician skill' },
      { status: 500 }
    );
  }
}
