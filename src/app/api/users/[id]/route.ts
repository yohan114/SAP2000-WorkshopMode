import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiValidationError,
  handleApiError,
} from '@/lib/api-utils';
import { auditLog } from '@/lib/audit';

// Validation schema for user update
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  department: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/users/[id] - Get user details with roles and privileges
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        department: true,
        costCentre: true,
        contractType: true,
        riskLevel: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        deletedAt: true,
        roles: {
          where: { isActive: true },
          select: {
            id: true,
            validFrom: true,
            validTo: true,
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Get user's effective privileges from roles
    const roleIds = user.roles.map(ur => ur.role.id);
    
    const rolePrivileges = await db.rolePrivilegeSet.findMany({
      where: {
        roleId: { in: roleIds },
        isGranted: true,
      },
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
    });

    // Get user's privilege overrides
    const privilegeOverrides = await db.userPrivilegeOverride.findMany({
      where: {
        userId: id,
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
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
    });

    // Compute effective privileges (role privileges + overrides)
    const rolePrivilegeCodes = new Set(
      rolePrivileges.map(rp => rp.privilege.code)
    );
    
    // Apply overrides
    const grantedOverrides = privilegeOverrides
      .filter(po => po.isGranted)
      .map(po => po.privilege.code);
    const revokedOverrides = privilegeOverrides
      .filter(po => !po.isGranted)
      .map(po => po.privilege.code);

    // Final effective privileges: role privileges + granted overrides - revoked overrides
    const effectivePrivileges = [
      ...rolePrivilegeCodes,
      ...grantedOverrides,
    ].filter(code => !revokedOverrides.includes(code));

    return apiSuccess({
      ...user,
      effectivePrivileges: [...new Set(effectivePrivileges)],
      privilegeCount: effectivePrivileges.length,
      roleCount: user.roles.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/users/[id] - Update user details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!existingUser) {
      return apiNotFound('User');
    }

    // If email is being updated, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: validatedData.email },
      });
      if (emailExists) {
        return apiError('Email already in use', 400);
      }
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        department: true,
        costCentre: true,
        contractType: true,
        riskLevel: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    await auditLog({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      newValue: validatedData,
      oldValue: existingUser,
    });

    return apiSuccess(updatedUser, 'User updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// DELETE /api/users/[id] - Soft delete user (set isActive = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!existingUser) {
      return apiNotFound('User');
    }

    if (!existingUser.isActive) {
      return apiError('User is already deactivated', 400);
    }

    // Soft delete - set isActive to false
    const deletedUser = await db.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        deletedAt: true,
      },
    });

    // Deactivate all role assignments
    await db.userRole.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });

    // Audit log
    await auditLog({
      action: 'DELETE',
      entityType: 'USER',
      entityId: id,
      newValue: { isActive: false, deletedAt: deletedUser.deletedAt },
      oldValue: existingUser,
    });

    return apiSuccess(deletedUser, 'User deactivated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
