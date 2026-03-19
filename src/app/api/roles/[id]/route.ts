import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  level: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/roles/[id] - Get role details with all privileges
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const role = await db.role.findUnique({
      where: { id },
      include: {
        privileges: {
          include: {
            privilege: true,
          },
          orderBy: {
            privilege: {
              category: 'asc',
            },
          },
        },
        _count: {
          select: { 
            users: true,
            privileges: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Group privileges by category
    const privilegesByCategory = role.privileges.reduce<Record<string, typeof role.privileges>>((acc, p) => {
      const category = p.privilege.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(p);
      return acc;
    }, {});

    return NextResponse.json({ 
      data: {
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
        grantedPrivilegeCount: role.privileges.filter(p => p.isGranted).length,
        privileges: role.privileges.map(p => ({
          id: p.id,
          privilegeId: p.privilegeId,
          code: p.privilege.code,
          name: p.privilege.name,
          category: p.privilege.category,
          description: p.privilege.description,
          isGranted: p.isGranted,
          maxAmount: p.maxAmount ? Number(p.maxAmount) : null,
          workshopScope: p.workshopScope,
        })),
        privilegesByCategory,
      }
    });
  } catch (error) {
    console.error('Failed to fetch role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    // Check if role exists
    const existing = await db.role.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent modification of system roles (optional: add a system flag to Role model)
    const systemRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];
    if (systemRoles.includes(existing.code) && validated.isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate a system role' },
        { status: 400 }
      );
    }

    const role = await db.role.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.level !== undefined && { level: validated.level }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
      include: {
        _count: {
          select: { 
            users: true,
            privileges: true,
          },
        },
        privileges: {
          where: { isGranted: true },
          include: {
            privilege: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      data: {
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
          privilegeId: p.privilegeId,
          code: p.privilege.code,
          name: p.privilege.name,
          category: p.privilege.category,
          isGranted: p.isGranted,
          maxAmount: p.maxAmount ? Number(p.maxAmount) : null,
          workshopScope: p.workshopScope,
        })),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to update role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] - Delete role (check if users assigned)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if role exists
    const existing = await db.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if users are assigned to this role
    if (existing._count.users > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete role with assigned users',
          details: {
            userCount: existing._count.users,
            message: `This role has ${existing._count.users} user(s) assigned. Please reassign users before deleting.`
          }
        },
        { status: 400 }
      );
    }

    // Prevent deletion of system roles
    const systemRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];
    if (systemRoles.includes(existing.code)) {
      return NextResponse.json(
        { error: 'Cannot delete a system role' },
        { status: 400 }
      );
    }

    // Delete role privileges first (cascade should handle this, but explicit is clearer)
    await db.rolePrivilegeSet.deleteMany({
      where: { roleId: id },
    });

    // Delete the role
    await db.role.delete({
      where: { id },
    });

    return NextResponse.json({ 
      data: { 
        id, 
        deleted: true,
        message: 'Role deleted successfully' 
      } 
    });
  } catch (error) {
    console.error('Failed to delete role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
