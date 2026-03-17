import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateRolesSchema = z.object({
  roleIds: z.array(z.string()),
});

// PUT /api/users/[id]/roles - Update user roles
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { roleIds } = updateRolesSchema.parse(body);

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete existing roles
    await db.userRole.deleteMany({
      where: { userId: id },
    });

    // Create new roles
    if (roleIds.length > 0) {
      await db.userRole.createMany({
        data: roleIds.map(roleId => ({
          userId: id,
          roleId,
          isActive: true,
        })),
      });
    }

    // Fetch updated user with roles
    const updatedUser = await db.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to update user roles:', error);
    return NextResponse.json(
      { error: 'Failed to update user roles' },
      { status: 500 }
    );
  }
}
