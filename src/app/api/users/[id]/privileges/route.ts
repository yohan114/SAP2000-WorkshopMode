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
const addPrivilegeOverrideSchema = z.object({
  privilegeId: z.string().min(1, 'Privilege ID is required'),
  isGranted: z.boolean(),
  reason: z.string().min(1, 'Reason is required'),
  validTo: z.string().optional().transform(v => v ? new Date(v) : null),
  grantedBy: z.string().min(1, 'Granted by user ID is required'),
});

const removePrivilegeOverrideSchema = z.object({
  privilegeId: z.string().min(1, 'Privilege ID is required'),
});

// GET /api/users/[id]/privileges - Get user's effective privileges
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        roles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Get role IDs
    const roleIds = user.roles.map(ur => ur.role.id);

    // Get privileges from roles
    const rolePrivileges = await db.rolePrivilegeSet.findMany({
      where: {
        roleId: { in: roleIds },
        isGranted: true,
      },
      include: {
        privilege: true,
        role: {
          select: {
            id: true,
            code: true,
            name: true,
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
        privilege: true,
      },
    });

    // Build effective privileges map
    const privilegeMap = new Map<string, {
      id: string;
      code: string;
      name: string;
      category: string;
      source: 'role' | 'override';
      sourceDetails?: string;
      isGranted: boolean;
      overrideId?: string;
      overrideReason?: string;
      validTo?: Date | null;
    }>();

    // Add role privileges
    for (const rp of rolePrivileges) {
      const existing = privilegeMap.get(rp.privilege.code);
      if (!existing) {
        privilegeMap.set(rp.privilege.code, {
          id: rp.privilege.id,
          code: rp.privilege.code,
          name: rp.privilege.name,
          category: rp.privilege.category,
          source: 'role',
          sourceDetails: rp.role.name,
          isGranted: true,
        });
      }
    }

    // Apply overrides
    for (const po of privilegeOverrides) {
      privilegeMap.set(po.privilege.code, {
        id: po.privilege.id,
        code: po.privilege.code,
        name: po.privilege.name,
        category: po.privilege.category,
        source: 'override',
        isGranted: po.isGranted,
        overrideId: po.id,
        overrideReason: po.reason || undefined,
        validTo: po.validTo,
      });
    }

    // Convert to arrays
    const allPrivileges = Array.from(privilegeMap.values());
    const effectivePrivileges = allPrivileges.filter(p => p.isGranted);
    const revokedPrivileges = allPrivileges.filter(p => !p.isGranted);

    // Group by category
    const byCategory = allPrivileges.reduce((acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = [];
      }
      acc[p.category].push(p);
      return acc;
    }, {} as Record<string, typeof allPrivileges>);

    // Get all available privileges for reference
    const availablePrivileges = await db.privilegeDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
      privileges: {
        all: allPrivileges,
        effective: effectivePrivileges,
        revoked: revokedPrivileges,
        byCategory,
      },
      overrides: privilegeOverrides.map(po => ({
        id: po.id,
        privilegeId: po.privilegeId,
        privilegeCode: po.privilege.code,
        privilegeName: po.privilege.name,
        category: po.privilege.category,
        isGranted: po.isGranted,
        reason: po.reason,
        validFrom: po.validFrom,
        validTo: po.validTo,
        grantedBy: po.grantedBy,
      })),
      summary: {
        totalPrivileges: allPrivileges.length,
        effectiveCount: effectivePrivileges.length,
        revokedCount: revokedPrivileges.length,
        overrideCount: privilegeOverrides.length,
      },
      availablePrivileges,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/users/[id]/privileges - Add privilege override
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = addPrivilegeOverrideSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Check if privilege exists
    const privilege = await db.privilegeDefinition.findUnique({
      where: { id: validatedData.privilegeId },
    });

    if (!privilege) {
      return apiNotFound('Privilege');
    }

    // Check if grantor exists
    const grantor = await db.user.findUnique({
      where: { id: validatedData.grantedBy },
      select: { id: true, name: true },
    });

    if (!grantor) {
      return apiError('Grantor user not found', 404);
    }

    // Check for existing override
    const existingOverride = await db.userPrivilegeOverride.findFirst({
      where: {
        userId: id,
        privilegeId: validatedData.privilegeId,
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
    });

    if (existingOverride) {
      // Update existing override
      const updated = await db.userPrivilegeOverride.update({
        where: { id: existingOverride.id },
        data: {
          isGranted: validatedData.isGranted,
          reason: validatedData.reason,
          validTo: validatedData.validTo,
          grantedBy: validatedData.grantedBy,
          updatedAt: new Date(),
        },
        include: {
          privilege: true,
        },
      });

      await auditLog({
        action: AuditAction.UPDATE,
        entityType: 'UserPrivilegeOverride',
        entityId: updated.id,
        newData: {
          privilegeCode: privilege.code,
          isGranted: validatedData.isGranted,
          reason: validatedData.reason,
        },
        oldData: existingOverride,
      });

      return apiSuccess(updated, 'Privilege override updated successfully');
    }

    // Create new override
    const override = await db.userPrivilegeOverride.create({
      data: {
        userId: id,
        privilegeId: validatedData.privilegeId,
        isGranted: validatedData.isGranted,
        reason: validatedData.reason,
        validTo: validatedData.validTo,
        grantedBy: validatedData.grantedBy,
      },
      include: {
        privilege: true,
      },
    });

    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'UserPrivilegeOverride',
      entityId: override.id,
      newData: {
        privilegeCode: privilege.code,
        privilegeName: privilege.name,
        isGranted: validatedData.isGranted,
        reason: validatedData.reason,
      },
    });

    return apiSuccess(override, 'Privilege override added successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// DELETE /api/users/[id]/privileges - Remove privilege override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const privilegeId = url.searchParams.get('privilegeId');

    if (!privilegeId) {
      return apiError('privilegeId query parameter is required', 400);
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Find the override
    const override = await db.userPrivilegeOverride.findFirst({
      where: {
        userId: id,
        privilegeId,
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
      include: {
        privilege: true,
      },
    });

    if (!override) {
      return apiNotFound('Privilege override');
    }

    // Delete the override
    await db.userPrivilegeOverride.delete({
      where: { id: override.id },
    });

    await auditLog({
      action: AuditAction.DELETE,
      entityType: 'UserPrivilegeOverride',
      entityId: override.id,
      newData: { removed: true },
      oldData: {
        privilegeCode: override.privilege.code,
        isGranted: override.isGranted,
      },
    });

    return apiSuccess({ removed: true }, 'Privilege override removed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
