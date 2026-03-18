import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  handleApiError,
} from '@/lib/api-utils';

// ============================================
// Validation Schemas
// ============================================

const updatePrivilegeSchema = z.object({
  privilegeId: z.string().min(1, 'Privilege ID is required'),
  isGranted: z.boolean().optional(),
  maxAmount: z.number().min(0).optional().nullable(),
  workshopScope: z.boolean().optional(),
});

const batchUpdateSchema = z.object({
  privileges: z.array(z.object({
    privilegeId: z.string().min(1),
    isGranted: z.boolean(),
    maxAmount: z.number().min(0).optional().nullable(),
    workshopScope: z.boolean().optional(),
  })),
});

// ============================================
// GET /api/privileges/roles/[id]
// Get all privileges for a role with details
// ============================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if role exists
    const role = await db.role.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        level: true,
        isActive: true,
        _count: {
          select: {
            users: { where: { isActive: true } },
            privileges: true,
          },
        },
      },
    });

    if (!role) {
      return apiNotFound('Role');
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
      where: { roleId: id, isGranted: true },
      include: {
        privilege: true,
      },
    });

    // Create a map of existing role privileges
    const privilegeMap = new Map(
      rolePrivileges.map(rp => [rp.privilegeId, rp])
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
    const byCategory = privileges.reduce<Record<string, typeof privileges>>((acc, p) => {
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
      byCategory: Object.entries(byCategory).map(([category, items]) => ({
        category,
        total: items.length,
        assigned: items.filter(p => p.isAssigned).length,
        granted: items.filter(p => p.isGranted).length,
      })),
    };

    return apiSuccess({
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        level: role.level,
        isActive: role.isActive,
        userCount: role._count.users,
      },
      privileges,
      byCategory,
      summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// PUT /api/privileges/roles/[id]
// Update privilege settings for a role
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if it's a batch update or single update
    const isBatch = 'privileges' in body;

    if (isBatch) {
      return handleBatchUpdate(id, body);
    } else {
      return handleSingleUpdate(id, body);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// ============================================
// Helper: Single Privilege Update
// ============================================

async function handleSingleUpdate(roleId: string, body: unknown) {
  const validated = updatePrivilegeSchema.parse(body);

  // Check if role exists
  const role = await db.role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    return apiNotFound('Role');
  }

  // Check if privilege exists
  const privilege = await db.privilegeDefinition.findUnique({
    where: { id: validated.privilegeId },
  });

  if (!privilege) {
    return apiNotFound('Privilege');
  }

  // Find the existing role privilege
  const existing = await db.rolePrivilegeSet.findUnique({
    where: {
      roleId_privilegeId: {
        roleId,
        privilegeId: validated.privilegeId,
      },
    },
  });

  if (!existing) {
    // Create new privilege assignment
    const rolePrivilege = await db.rolePrivilegeSet.create({
      data: {
        roleId,
        privilegeId: validated.privilegeId,
        isGranted: validated.isGranted ?? true,
        maxAmount: validated.maxAmount != null ? new Prisma.Decimal(validated.maxAmount) : null,
        workshopScope: validated.workshopScope ?? false,
      },
      include: {
        privilege: true,
      },
    });

    return apiSuccess({
      id: rolePrivilege.id,
      privilegeId: rolePrivilege.privilegeId,
      code: rolePrivilege.privilege.code,
      name: rolePrivilege.privilege.name,
      category: rolePrivilege.privilege.category,
      isGranted: rolePrivilege.isGranted,
      maxAmount: rolePrivilege.maxAmount ? Number(rolePrivilege.maxAmount) : null,
      workshopScope: rolePrivilege.workshopScope,
      message: 'Privilege assigned to role successfully',
    });
  }

  // Build update data
  const updateData: {
    isGranted?: boolean;
    maxAmount?: Prisma.Decimal | null;
    workshopScope?: boolean;
  } = {};

  if (validated.isGranted !== undefined) {
    updateData.isGranted = validated.isGranted;
  }
  if (validated.maxAmount !== undefined) {
    updateData.maxAmount = validated.maxAmount != null ? new Prisma.Decimal(validated.maxAmount) : null;
  }
  if (validated.workshopScope !== undefined) {
    updateData.workshopScope = validated.workshopScope;
  }

  // Update the role privilege
  const rolePrivilege = await db.rolePrivilegeSet.update({
    where: {
      roleId_privilegeId: {
        roleId,
        privilegeId: validated.privilegeId,
      },
    },
    data: updateData,
    include: {
      privilege: true,
    },
  });

  return apiSuccess({
    id: rolePrivilege.id,
    privilegeId: rolePrivilege.privilegeId,
    code: rolePrivilege.privilege.code,
    name: rolePrivilege.privilege.name,
    category: rolePrivilege.privilege.category,
    isGranted: rolePrivilege.isGranted,
    maxAmount: rolePrivilege.maxAmount ? Number(rolePrivilege.maxAmount) : null,
    workshopScope: rolePrivilege.workshopScope,
    message: 'Privilege settings updated successfully',
  });
}

// ============================================
// Helper: Batch Privilege Update
// ============================================

async function handleBatchUpdate(roleId: string, body: unknown) {
  const validated = batchUpdateSchema.parse(body);

  // Check if role exists
  const role = await db.role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    return apiNotFound('Role');
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Process each privilege update in a transaction
  await db.$transaction(async (tx) => {
    for (const privUpdate of validated.privileges) {
      try {
        // Check if privilege exists
        const privilege = await tx.privilegeDefinition.findUnique({
          where: { id: privUpdate.privilegeId },
        });

        if (!privilege) {
          results.failed++;
          results.errors.push(`Privilege ${privUpdate.privilegeId} not found`);
          continue;
        }

        // Upsert the privilege
        await tx.rolePrivilegeSet.upsert({
          where: {
            roleId_privilegeId: {
              roleId,
              privilegeId: privUpdate.privilegeId,
            },
          },
          create: {
            roleId,
            privilegeId: privUpdate.privilegeId,
            isGranted: privUpdate.isGranted,
            maxAmount: privUpdate.maxAmount != null ? new Prisma.Decimal(privUpdate.maxAmount) : null,
            workshopScope: privUpdate.workshopScope ?? false,
          },
          update: {
            isGranted: privUpdate.isGranted,
            maxAmount: privUpdate.maxAmount != null ? new Prisma.Decimal(privUpdate.maxAmount) : null,
            workshopScope: privUpdate.workshopScope,
          },
        });

        results.success++;
      } catch {
        results.failed++;
        results.errors.push(`Failed to update privilege ${privUpdate.privilegeId}`);
      }
    }
  });

  return apiSuccess({
    message: `Updated ${results.success} privilege(s)`,
    ...results,
  });
}
