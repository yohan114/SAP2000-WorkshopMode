import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for skill
const skillSchema = z.object({
  code: z.string().min(1, 'Skill code is required'),
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().default('GENERAL'),
  level: z.number().min(1).max(4).default(1),
  description: z.string().optional(),
  expires: z.boolean().default(false),
  validityDays: z.number().optional(),
  certifyingBody: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/labour/skills - List all skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (category) {
      where.category = category;
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [skills, total] = await Promise.all([
      db.skill.findMany({
        where,
        include: {
          _count: {
            select: { technicianSkills: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.skill.count({ where }),
    ]);

    return NextResponse.json({
      data: skills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

// POST /api/labour/skills - Create a new skill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = skillSchema.parse(body);

    // Check if skill code already exists
    const existingSkill = await db.skill.findUnique({
      where: { code: validatedData.code },
    });

    if (existingSkill) {
      return NextResponse.json(
        { error: 'Skill code already exists' },
        { status: 400 }
      );
    }

    const skill = await db.skill.create({
      data: validatedData,
    });

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}
