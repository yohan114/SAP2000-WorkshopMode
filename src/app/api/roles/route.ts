import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createRoleSchema = z.object({
  code: z.string().min(1).max(50).transform(val => val.toUpperCase()),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  level: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/roles - List all roles with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // 'active', 'inactive', or empty for all
    
    // Build where clause
    const where: {
      OR?: Array<{ code: { contains: string }; name: { contains: string } }>;
      isActive?: boolean;
    } = {};
    
    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase() } },
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const roles = await db.role.findMany({
      where,
      include: {
        _count: {
          select: { 
            users: true,
            privileges: true,
          },
        },
        privileges: {
          where: { isGranted: true },
          select: {
            id: true,
            privilege: {
              select: {
                code: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
    });

    // Transform data to include computed fields
    const data = roles.map(role => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      level: role.level,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      userCount: role._count.users,
      privilegeCount: role._count.privileges,
      grantedPrivilegeCount: role.privileges.length,
      privileges: role.privileges.map(p => ({
        id: p.id,
        code: p.privilege.code,
        name: p.privilege.name,
        category: p.privilege.category,
      })),
    }));

    return NextResponse.json({ 
      data,
      meta: {
        total: data.length,
        activeCount: data.filter(r => r.isActive).length,
        inactiveCount: data.filter(r => !r.isActive).length,
      }
    });
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
      include: {
        _count: {
          select: { 
            users: true,
            privileges: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      data: {
        ...role,
        userCount: role._count.users,
        privilegeCount: role._count.privileges,
      }
    }, { status: 201 });
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
