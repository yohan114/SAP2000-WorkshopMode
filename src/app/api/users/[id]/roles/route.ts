import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiValidationError,
  handleApiError,
} from '@/lib/api-utils';
import { auditLog, AuditAction } from '@/lib/audit';

// Validation schemas
const updateRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
});

const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  workshopId: z.string().optional().nullable(),
  validFrom: z.string().optional().transform(v => v ? new Date(v) : new Date()),
  validTo: z.string().optional().transform(v => v ? new Date(v) : null),
});

const removeRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
});

// GET /api/users/[id]/roles - Get user's assigned roles
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Get user's roles with details
    const userRoles = await db.userRole.findMany({
      where: { userId: id },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            description: true,
            isActive: true,
            privileges: {
              where: { isGranted: true },
              include: {
                privilege: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { role: { level: 'desc' } },
    });

    // Format response
    const roles = userRoles.map(ur => ({
      id: ur.id,
      roleId: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
      level: ur.role.level,
      description: ur.role.description,
      isActive: ur.role.isActive && ur.isActive,
      validFrom: ur.validFrom,
      validTo: ur.validTo,
      workshopId: ur.workshopId,
      privilegeCount: ur.role.privileges.length,
      privileges: ur.role.privileges.map(p => ({
        id: p.privilege.id,
        code: p.privilege.code,
        name: p.privilege.name,
        category: p.privilege.category,
      })),
    }));

    // Get available roles (for assignment)
    const availableRoles = await db.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        description: true,
      },
      orderBy: { level: 'desc' },
    });

    return apiSuccess({
      roles,
      availableRoles,
      roleCount: roles.length,
      activeRoleCount: roles.filter(r => r.isActive && (!r.validTo || new Date(r.validTo) > new Date())).length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/users/[id]/roles - Assign a role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = assignRoleSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    if (!user.isActive) {
      return apiError('Cannot assign roles to inactive user', 400);
    }

    // Check if role exists and is active
    const role = await db.role.findUnique({
      where: { id: validatedData.roleId },
      select: { id: true, code: true, name: true, isActive: true },
    });

    if (!role) {
      return apiNotFound('Role');
    }

    if (!role.isActive) {
      return apiError('Cannot assign inactive role', 400);
    }

    // Check if role is already assigned
    const existingAssignment = await db.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId: validatedData.roleId,
        },
      },
    });

    if (existingAssignment) {
      // Re-activate if inactive
      if (!existingAssignment.isActive) {
        const updated = await db.userRole.update({
          where: { id: existingAssignment.id },
          data: {
            isActive: true,
            validFrom: validatedData.validFrom,
            validTo: validatedData.validTo,
            workshopId: validatedData.workshopId,
          },
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
              },
            },
          },
        });

        await auditLog({
          action: AuditAction.ASSIGN,
          entityType: 'UserRole',
          entityId: updated.id,
          newData: { roleId: validatedData.roleId, roleName: role.name },
          oldData: existingAssignment,
        });

        return apiSuccess(updated, 'Role re-activated successfully');
      }
      return apiError('Role already assigned to user', 400);
    }

    // Create new role assignment
    const userRole = await db.userRole.create({
      data: {
        userId: id,
        roleId: validatedData.roleId,
        workshopId: validatedData.workshopId,
        validFrom: validatedData.validFrom,
        validTo: validatedData.validTo,
        isActive: true,
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
          },
        },
      },
    });

    await auditLog({
      action: AuditAction.ASSIGN,
      entityType: 'UserRole',
      entityId: userRole.id,
      newData: { roleId: validatedData.roleId, roleName: role.name },
    });

    return apiSuccess(userRole, 'Role assigned successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// PUT /api/users/[id]/roles - Update user roles (bulk replace)
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
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Verify all roles exist
    const roles = await db.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, code: true, name: true },
    });

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map(r => r.id);
      const missingIds = roleIds.filter(rid => !foundIds.includes(rid));
      return apiError(`Roles not found: ${missingIds.join(', ')}`, 400);
    }

    // Get existing role assignments
    const existingRoles = await db.userRole.findMany({
      where: { userId: id },
    });

    // Delete existing roles
    await db.userRole.deleteMany({
      where: { userId: id },
    });

    // Create new roles
    await db.userRole.createMany({
      data: roleIds.map(roleId => ({
        userId: id,
        roleId,
        isActive: true,
      })),
    });

    // Fetch updated user with roles
    const updatedUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });

    await auditLog({
      action: AuditAction.UPDATE,
      entityType: 'UserRoles',
      entityId: id,
      newData: { roleIds, roles: roles.map(r => r.name) },
      oldData: { roleIds: existingRoles.map(ur => ur.roleId) },
    });

    return apiSuccess(updatedUser, 'User roles updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// DELETE /api/users/[id]/roles - Remove a role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const roleId = url.searchParams.get('roleId');

    if (!roleId) {
      return apiError('roleId query parameter is required', 400);
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Find the role assignment
    const userRole = await db.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId,
        },
      },
      include: {
        role: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!userRole) {
      return apiNotFound('Role assignment');
    }

    // Delete the role assignment
    await db.userRole.delete({
      where: { id: userRole.id },
    });

    await auditLog({
      action: AuditAction.DELETE,
      entityType: 'UserRole',
      entityId: userRole.id,
      newData: { removed: true },
      oldData: { roleId, roleName: userRole.role.name },
    });

    return apiSuccess({ removed: true }, 'Role removed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
