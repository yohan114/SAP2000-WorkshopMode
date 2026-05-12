import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const addPrivilegeSchema = z.object({
  privilegeId: z.string().min(1),
  isGranted: z.boolean().optional().default(true),
  maxAmount: z.number().min(0).optional().nullable(),
  workshopScope: z.boolean().optional().default(false),
});

const updatePrivilegeSchema = z.object({
  privilegeId: z.string().min(1),
  isGranted: z.boolean().optional(),
  maxAmount: z.number().min(0).optional().nullable(),
  workshopScope: z.boolean().optional(),
});

const removePrivilegeSchema = z.object({
  privilegeId: z.string().min(1),
});

// GET /api/roles/[id]/privileges - Get all privileges for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if role exists
    const role = await db.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Get all privilege definitions
    const allPrivileges = await db.privilegeDefinition.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get role's current privileges
    const rolePrivileges = await db.rolePrivilegeSet.findMany({
      where: { roleId: id },
      include: {
        privilege: true,
      },
    });

    // Create a map of existing role privileges
    const privilegeMap = new Map(
      (rolePrivileges as any[]).map(rp => [rp.privilegeId, rp])
    );

    // Combine all privileges with role's settings
    const privileges = allPrivileges.map(priv => {
      const rolePriv = privilegeMap.get(priv.id);
      return {
        id: rolePriv?.id || null,
        privilegeId: priv.id,
        code: priv.code,
        name: priv.name,
        category: priv.category,
        description: priv.description,
        isGranted: rolePriv?.isGranted ?? false,
        maxAmount: rolePriv?.maxAmount ? Number(rolePriv.maxAmount) : null,
        workshopScope: rolePriv?.workshopScope ?? false,
        isAssigned: !!rolePriv,
      };
    });

    // Group by category
    const byCategory = privileges.reduce((acc: Record<string, typeof privileges>, p) => {
      const cat = p.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(p);
      return acc;
    }, {});

    // Calculate summary
    const summary = {
      total: privileges.length,
      assigned: privileges.filter(p => p.isAssigned).length,
      granted: privileges.filter(p => p.isGranted).length,
      byCategory: (Object.entries(byCategory) as [string, any[]][]).map(([category, items]) => ({
        category,
        total: items.length,
        assigned: items.filter(p => p.isAssigned).length,
        granted: items.filter(p => p.isGranted).length,
      })),
    };

    return NextResponse.json({ 
      data: {
        role: {
          id: role.id,
          code: role.code,
          name: role.name,
        },
        privileges,
        byCategory,
        summary,
      }
    });
  } catch (error) {
    console.error('Failed to fetch role privileges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role privileges' },
      { status: 500 }
    );
  }
}

// POST /api/roles/[id]/privileges - Add privilege to role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = addPrivilegeSchema.parse(body);

    // Check if role exists
    const role = await db.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if privilege exists
    const privilege = await db.privilegeDefinition.findUnique({
      where: { id: validated.privilegeId },
    });

    if (!privilege) {
      return NextResponse.json(
        { error: 'Privilege not found' },
        { status: 404 }
      );
    }

    // Check if already assigned
    const existing = await db.rolePrivilegeSet.findUnique({
      where: {
        roleId_privilegeId: {
          roleId: id,
          privilegeId: validated.privilegeId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Privilege already assigned to this role' },
        { status: 400 }
      );
    }

    // Create the role privilege
    const rolePrivilege = await db.rolePrivilegeSet.create({
      data: {
        roleId: id,
        privilegeId: validated.privilegeId,
        isGranted: validated.isGranted,
        maxAmount: validated.maxAmount != null ? validated.maxAmount : null,
        workshopScope: validated.workshopScope,
      },
      include: {
        privilege: true,
      },
    });

    return NextResponse.json({ 
      data: {
        id: rolePrivilege.id,
        privilegeId: rolePrivilege.privilegeId,
        code: rolePrivilege.privilege.code,
        name: rolePrivilege.privilege.name,
        category: rolePrivilege.privilege.category,
        isGranted: rolePrivilege.isGranted,
        maxAmount: rolePrivilege.maxAmount ? Number(rolePrivilege.maxAmount) : null,
        workshopScope: rolePrivilege.workshopScope,
        message: 'Privilege added to role successfully',
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to add privilege to role:', error);
    return NextResponse.json(
      { error: 'Failed to add privilege to role' },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id]/privileges - Update privilege settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updatePrivilegeSchema.parse(body);

    // Check if role exists
    const role = await db.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Find the existing role privilege
    const existing = await db.rolePrivilegeSet.findUnique({
      where: {
        roleId_privilegeId: {
          roleId: id,
          privilegeId: validated.privilegeId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Privilege not assigned to this role' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      isGranted?: boolean;
      maxAmount?: number | null;
      workshopScope?: boolean;
    } = {};
    
    if (validated.isGranted !== undefined) {
      updateData.isGranted = validated.isGranted;
    }
    if (validated.maxAmount !== undefined) {
      updateData.maxAmount = validated.maxAmount != null ? validated.maxAmount : null;
    }
    if (validated.workshopScope !== undefined) {
      updateData.workshopScope = validated.workshopScope;
    }

    // Update the role privilege
    const rolePrivilege = await db.rolePrivilegeSet.update({
      where: {
        roleId_privilegeId: {
          roleId: id,
          privilegeId: validated.privilegeId,
        },
      },
      data: updateData,
      include: {
        privilege: true,
      },
    });

    return NextResponse.json({ 
      data: {
        id: rolePrivilege.id,
        privilegeId: rolePrivilege.privilegeId,
        code: rolePrivilege.privilege.code,
        name: rolePrivilege.privilege.name,
        category: rolePrivilege.privilege.category,
        isGranted: rolePrivilege.isGranted,
        maxAmount: rolePrivilege.maxAmount ? Number(rolePrivilege.maxAmount) : null,
        workshopScope: rolePrivilege.workshopScope,
        message: 'Privilege settings updated successfully',
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update role privilege:', error);
    return NextResponse.json(
      { error: 'Failed to update role privilege' },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id]/privileges - Remove privilege from role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const privilegeId = searchParams.get('privilegeId');

    if (!privilegeId) {
      return NextResponse.json(
        { error: 'privilegeId query parameter is required' },
        { status: 400 }
      );
    }

    // Check if role exists
    const role = await db.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Find and delete the role privilege
    const existing = await db.rolePrivilegeSet.findUnique({
      where: {
        roleId_privilegeId: {
          roleId: id,
          privilegeId,
        },
      },
      include: {
        privilege: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Privilege not assigned to this role' },
        { status: 404 }
      );
    }

    await db.rolePrivilegeSet.delete({
      where: {
        roleId_privilegeId: {
          roleId: id,
          privilegeId,
        },
      },
    });

    return NextResponse.json({ 
      data: {
        id: existing.id,
        privilegeId: existing.privilegeId,
        code: existing.privilege.code,
        name: existing.privilege.name,
        message: 'Privilege removed from role successfully',
      }
    });
  } catch (error) {
    console.error('Failed to remove privilege from role:', error);
    return NextResponse.json(
      { error: 'Failed to remove privilege from role' },
      { status: 500 }
    );
  }
}
