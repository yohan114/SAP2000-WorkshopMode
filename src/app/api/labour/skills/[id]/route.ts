import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for skill update
const skillUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  level: z.number().min(1).max(4).optional(),
  description: z.string().optional(),
  expires: z.boolean().optional(),
  validityDays: z.number().optional(),
  certifyingBody: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/labour/skills/[id] - Get single skill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const skill = await db.skill.findUnique({
      where: { id },
      include: {
        technicianSkills: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                name: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Error fetching skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}

// PUT /api/labour/skills/[id] - Update skill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = skillUpdateSchema.parse(body);

    const skill = await db.skill.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(skill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/labour/skills/[id] - Delete skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if skill is assigned to any technicians
    const technicianSkillCount = await db.technicianSkill.count({
      where: { skillId: id },
    });

    if (technicianSkillCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete skill that is assigned to technicians' },
        { status: 400 }
      );
    }

    await db.skill.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
