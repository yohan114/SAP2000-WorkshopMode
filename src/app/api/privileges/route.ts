import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createPrivilegeSchema = z.object({
  code: z.string().min(1).max(50).transform(val => val.toUpperCase()),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/privileges - List all privilege definitions with category filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const includeUsage = searchParams.get('includeUsage') === 'true';

    // Build where clause
    const where: {
      category?: string;
      OR?: Array<{
        code?: { contains: string };
        name?: { contains: string };
        description?: { contains: string };
      }>;
    } = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search.toUpperCase() } },
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const privileges = await db.privilegeDefinition.findMany({
      where,
      include: {
        _count: {
          select: { rolePrivileges: true },
        },
      },
      orderBy: [
        { category: 'asc' },
        { code: 'asc' },
      ],
    });

    // Get unique categories for filtering
    const categories = await db.privilegeDefinition.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    // Transform data
    const data = privileges.map(priv => ({
      id: priv.id,
      code: priv.code,
      name: priv.name,
      category: priv.category,
      description: priv.description,
      isActive: priv.isActive,
      createdAt: priv.createdAt,
      updatedAt: priv.updatedAt,
      roleCount: includeUsage ? (priv as any)._count?.rolePrivileges : undefined,
    }));

    // Group by category
    const byCategory = data.reduce((acc: Record<string, typeof data>, p) => {
      const cat = p.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(p);
      return acc;
    }, {});

    return NextResponse.json({ 
      data,
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.id,
      })),
      byCategory,
      meta: {
        total: data.length,
        activeCount: data.filter(p => p.isActive).length,
        inactiveCount: data.filter(p => !p.isActive).length,
        categoryCount: categories.length,
      }
    });
  } catch (error) {
    console.error('Failed to fetch privileges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privileges' },
      { status: 500 }
    );
  }
}

// POST /api/privileges - Create new privilege definition (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createPrivilegeSchema.parse(body);

    // Check if code already exists
    const existing = await db.privilegeDefinition.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Privilege code already exists' },
        { status: 400 }
      );
    }

    const privilege = await db.privilegeDefinition.create({
      data: {
        code: validated.code,
        name: validated.name,
        category: validated.category,
        description: validated.description,
        isActive: validated.isActive ?? true,
      },
    });

    return NextResponse.json({ 
      data: privilege,
      message: 'Privilege created successfully'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to create privilege:', error);
    return NextResponse.json(
      { error: 'Failed to create privilege' },
      { status: 500 }
    );
  }
}
