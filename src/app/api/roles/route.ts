import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createRoleSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  level: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/roles - List all roles
export async function GET(request: NextRequest) {
  try {
    const roles = await db.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { level: 'asc' },
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createRoleSchema.parse(body);

    // Check if code already exists
    const existing = await db.role.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Role code already exists' },
        { status: 400 }
      );
    }

    const role = await db.role.create({
      data: {
        code: validated.code,
        name: validated.name,
        description: validated.description,
        level: validated.level || 1,
        isActive: validated.isActive ?? true,
      },
    });

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to create role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
