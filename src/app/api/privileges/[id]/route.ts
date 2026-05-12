import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updatePrivilegeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/privileges/[id] - Get privilege details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const privilege = await db.privilegeDefinition.findUnique({
      where: { id },
      include: {
        rolePrivileges: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: { rolePrivileges: true },
        },
      },
    });

    if (!privilege) {
      return NextResponse.json(
        { error: 'Privilege not found' },
        { status: 404 }
      );
    }

    // Get roles using this privilege
    const rolesUsingPrivilege = privilege.rolePrivileges.map(rp => ({
      id: rp.role.id,
      code: rp.role.code,
      name: rp.role.name,
      isActive: rp.role.isActive,
      isGranted: rp.isGranted,
      maxAmount: rp.maxAmount ? Number(rp.maxAmount) : null,
      workshopScope: rp.workshopScope,
    }));

    // Get other privileges in the same category
    const relatedPrivileges = await db.privilegeDefinition.findMany({
      where: {
        category: privilege.category,
        id: { not: id },
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ 
      data: {
        id: privilege.id,
        code: privilege.code,
        name: privilege.name,
        category: privilege.category,
        description: privilege.description,
        isActive: privilege.isActive,
        createdAt: privilege.createdAt,
        updatedAt: privilege.updatedAt,
        roleCount: privilege._count.rolePrivileges,
        rolesUsingPrivilege,
        relatedPrivileges,
        summary: {
          totalRoles: privilege._count.rolePrivileges,
          grantedRoles: privilege.rolePrivileges.filter(rp => rp.isGranted).length,
          activeRoles: privilege.rolePrivileges.filter(rp => rp.role.isActive).length,
        },
      }
    });
  } catch (error) {
    console.error('Failed to fetch privilege:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privilege' },
      { status: 500 }
    );
  }
}

// PUT /api/privileges/[id] - Update privilege definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updatePrivilegeSchema.parse(body);

    // Check if privilege exists
    const existing = await db.privilegeDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Privilege not found' },
        { status: 404 }
      );
    }

    // Prevent modification of system privileges (optional: add a system flag to PrivilegeDefinition model)
    const systemPrivileges = [
      'SYSTEM_ADMIN',
      'MANAGE_USERS',
      'MANAGE_ROLES',
      'VIEW_AUDIT_LOGS',
    ];
    if (systemPrivileges.includes(existing.code) && validated.isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate a system privilege' },
        { status: 400 }
      );
    }

    const privilege = await db.privilegeDefinition.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
      include: {
        _count: {
          select: { rolePrivileges: true },
        },
      },
    });

    return NextResponse.json({ 
      data: {
        id: privilege.id,
        code: privilege.code,
        name: privilege.name,
        category: privilege.category,
        description: privilege.description,
        isActive: privilege.isActive,
        createdAt: privilege.createdAt,
        updatedAt: privilege.updatedAt,
        roleCount: privilege._count.rolePrivileges,
        message: 'Privilege updated successfully',
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update privilege:', error);
    return NextResponse.json(
      { error: 'Failed to update privilege' },
      { status: 500 }
    );
  }
}

// DELETE /api/privileges/[id] - Delete privilege (check if used in roles)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if privilege exists
    const existing = await db.privilegeDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rolePrivileges: true },
        },
        rolePrivileges: {
          include: {
            role: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          take: 5,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Privilege not found' },
        { status: 404 }
      );
    }

    // Check if privilege is used in roles
    if (existing._count.rolePrivileges > 0) {
      const rolesUsing = existing.rolePrivileges.map(rp => rp.role.name);
      return NextResponse.json(
        { 
          error: 'Cannot delete privilege that is assigned to roles',
          details: {
            roleCount: existing._count.rolePrivileges,
            roles: rolesUsing,
            message: `This privilege is used by ${existing._count.rolePrivileges} role(s). Please remove it from all roles before deleting.`
          }
        },
        { status: 400 }
      );
    }

    // Prevent deletion of system privileges
    const systemPrivileges = [
      'SYSTEM_ADMIN',
      'MANAGE_USERS',
      'MANAGE_ROLES',
      'VIEW_AUDIT_LOGS',
    ];
    if (systemPrivileges.includes(existing.code)) {
      return NextResponse.json(
        { error: 'Cannot delete a system privilege' },
        { status: 400 }
      );
    }

    // Delete the privilege
    await db.privilegeDefinition.delete({
      where: { id },
    });

    return NextResponse.json({ 
      data: { 
        id, 
        deleted: true,
        message: 'Privilege deleted successfully' 
      } 
    });
  } catch (error) {
    console.error('Failed to delete privilege:', error);
    return NextResponse.json(
      { error: 'Failed to delete privilege' },
      { status: 500 }
    );
  }
}
