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
import { auditLog } from '@/lib/audit';

// ============================================
// Validation Schemas
// ============================================

const createOverrideSchema = z.object({
  privilegeId: z.string().min(1, 'Privilege ID is required'),
  privilegeCode: z.string().optional(), // Alternative: use code instead of ID
  isGranted: z.boolean(),
  reason: z.string().min(1, 'Reason is required'),
  validFrom: z.string().optional().transform(v => v ? new Date(v) : new Date()),
  validTo: z.string().optional().transform(v => v ? new Date(v) : null),
  grantedBy: z.string().min(1, 'Granted by user ID is required'),
});

const updateOverrideSchema = z.object({
  isGranted: z.boolean().optional(),
  reason: z.string().min(1).optional(),
  validTo: z.string().optional().transform(v => v ? new Date(v) : null),
});

// ============================================
// GET /api/privileges/users/[id]/overrides
// Get all privilege overrides for a user
// ============================================

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
        employeeId: true,
        department: true,
        isActive: true,
        roles: {
          where: { isActive: true },
          select: {
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

    if (!user) {
      return apiNotFound('User');
    }

    // Get user's privilege overrides
    const overrides = await db.userPrivilegeOverride.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get grantor names
    const grantorIds = [...new Set(overrides.map(o => o.grantedBy))];
    const grantors = await db.user.findMany({
      where: { id: { in: grantorIds } },
      select: { id: true, name: true },
    });
    const grantorMap = new Map(grantors.map(g => [g.id, g.name]));

    // Format overrides
    const formattedOverrides = overrides.map(o => ({
      id: o.id,
      privilegeId: o.privilegeId,
      privilegeCode: o.privilege.code,
      privilegeName: o.privilege.name,
      category: o.privilege.category,
      isGranted: o.isGranted,
      reason: o.reason,
      validFrom: o.validFrom,
      validTo: o.validTo,
      grantedBy: o.grantedBy,
      grantedByName: grantorMap.get(o.grantedBy) || 'Unknown',
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    // Get all available privileges for reference
    const availablePrivileges = await db.privilegeDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    // Group available privileges by category
    const privilegesByCategory = availablePrivileges.reduce<Record<string, typeof availablePrivileges>>((acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = [];
      }
      acc[p.category].push(p);
      return acc;
    }, {});

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department,
        isActive: user.isActive,
        roles: user.roles.map(r => ({
          id: r.role.id,
          code: r.role.code,
          name: r.role.name,
          level: r.role.level,
        })),
      },
      overrides: formattedOverrides,
      summary: {
        total: overrides.length,
        grants: overrides.filter(o => o.isGranted).length,
        revokes: overrides.filter(o => !o.isGranted).length,
        expired: overrides.filter(o => o.validTo && new Date(o.validTo) < new Date()).length,
      },
      availablePrivileges,
      privilegesByCategory,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// POST /api/privileges/users/[id]/overrides
// Create a new privilege override
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = createOverrideSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user) {
      return apiNotFound('User');
    }

    // Get privilege by ID or code
    let privilege;
    if (validated.privilegeCode) {
      privilege = await db.privilegeDefinition.findUnique({
        where: { code: validated.privilegeCode },
      });
    } else {
      privilege = await db.privilegeDefinition.findUnique({
        where: { id: validated.privilegeId },
      });
    }

    if (!privilege) {
      return apiNotFound('Privilege');
    }

    // Check if grantor exists
    const grantor = await db.user.findUnique({
      where: { id: validated.grantedBy },
      select: { id: true, name: true },
    });

    if (!grantor) {
      return apiError('Grantor user not found', 404);
    }

    // Check for existing override
    const existingOverride = await db.userPrivilegeOverride.findFirst({
      where: {
        userId: id,
        privilegeId: privilege.id,
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
          isGranted: validated.isGranted,
          reason: validated.reason,
          validFrom: validated.validFrom,
          validTo: validated.validTo,
          grantedBy: validated.grantedBy,
          updatedAt: new Date(),
        },
        include: {
          privilege: true,
        },
      });

      await auditLog({
        action: 'UPDATE',
        entityType: 'USER_PRIVILEGE_OVERRIDE',
        entityId: updated.id,
        newValue: {
          userId: id,
          privilegeCode: privilege.code,
          isGranted: validated.isGranted,
          reason: validated.reason,
        },
        oldValue: existingOverride,
      });

      return apiSuccess({
        id: updated.id,
        privilegeId: updated.privilegeId,
        privilegeCode: updated.privilege.code,
        privilegeName: updated.privilege.name,
        category: updated.privilege.category,
        isGranted: updated.isGranted,
        reason: updated.reason,
        validFrom: updated.validFrom,
        validTo: updated.validTo,
        grantedBy: updated.grantedBy,
        grantedByName: grantor.name,
        message: 'Privilege override updated successfully',
      });
    }

    // Create new override
    const override = await db.userPrivilegeOverride.create({
      data: {
        userId: id,
        privilegeId: privilege.id,
        isGranted: validated.isGranted,
        reason: validated.reason,
        validFrom: validated.validFrom,
        validTo: validated.validTo,
        grantedBy: validated.grantedBy,
      },
      include: {
        privilege: true,
      },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'USER_PRIVILEGE_OVERRIDE',
      entityId: override.id,
      newValue: {
        userId: id,
        privilegeCode: privilege.code,
        privilegeName: privilege.name,
        isGranted: validated.isGranted,
        reason: validated.reason,
      },
    });

    return apiSuccess({
      id: override.id,
      privilegeId: override.privilegeId,
      privilegeCode: override.privilege.code,
      privilegeName: override.privilege.name,
      category: override.privilege.category,
      isGranted: override.isGranted,
      reason: override.reason,
      validFrom: override.validFrom,
      validTo: override.validTo,
      grantedBy: override.grantedBy,
      grantedByName: grantor.name,
      message: 'Privilege override created successfully',
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// ============================================
// PUT /api/privileges/users/[id]/overrides
// Update an existing privilege override
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const overrideId = url.searchParams.get('overrideId');

    if (!overrideId) {
      return apiError('overrideId query parameter is required', 400);
    }

    const body = await request.json();
    const validated = updateOverrideSchema.parse(body);

    // Check if override exists
    const existing = await db.userPrivilegeOverride.findFirst({
      where: {
        id: overrideId,
        userId: id,
      },
      include: {
        privilege: true,
      },
    });

    if (!existing) {
      return apiNotFound('Privilege override');
    }

    // Build update data
    const updateData: {
      isGranted?: boolean;
      reason?: string;
      validTo?: Date | null;
    } = {};

    if (validated.isGranted !== undefined) {
      updateData.isGranted = validated.isGranted;
    }
    if (validated.reason !== undefined) {
      updateData.reason = validated.reason;
    }
    if (validated.validTo !== undefined) {
      updateData.validTo = validated.validTo;
    }

    // Update the override
    const updated = await db.userPrivilegeOverride.update({
      where: { id: overrideId },
      data: updateData,
      include: {
        privilege: true,
      },
    });

    await auditLog({
      action: 'UPDATE',
      entityType: 'USER_PRIVILEGE_OVERRIDE',
      entityId: updated.id,
      newValue: {
        privilegeCode: updated.privilege.code,
        ...updateData,
      },
      oldValue: existing,
    });

    return apiSuccess({
      id: updated.id,
      privilegeId: updated.privilegeId,
      privilegeCode: updated.privilege.code,
      privilegeName: updated.privilege.name,
      category: updated.privilege.category,
      isGranted: updated.isGranted,
      reason: updated.reason,
      validTo: updated.validTo,
      message: 'Privilege override updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// ============================================
// DELETE /api/privileges/users/[id]/overrides
// Remove a privilege override
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const overrideId = url.searchParams.get('overrideId');
    const privilegeId = url.searchParams.get('privilegeId');

    if (!overrideId && !privilegeId) {
      return apiError('Either overrideId or privilegeId query parameter is required', 400);
    }

    // Find the override
    const where = overrideId
      ? { id: overrideId, userId: id }
      : {
          userId: id,
          privilegeId: privilegeId!,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } },
          ],
        };

    const override = await db.userPrivilegeOverride.findFirst({
      where,
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
      action: 'DELETE',
      entityType: 'USER_PRIVILEGE_OVERRIDE',
      entityId: override.id,
      newValue: { removed: true },
      oldValue: {
        privilegeCode: override.privilege.code,
        isGranted: override.isGranted,
      },
    });

    return apiSuccess({
      id: override.id,
      privilegeCode: override.privilege.code,
      privilegeName: override.privilege.name,
      message: 'Privilege override removed successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
