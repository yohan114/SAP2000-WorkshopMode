/**
 * Privilege Checking Utility
 * 
 * This module provides comprehensive privilege checking functions for the 
 * Workshop Control Platform (WCP). It handles:
 * - Role-based privileges
 * - User-specific privilege overrides (grants/revokes)
 * - Role validity periods (validFrom, validTo)
 * - Workshop-scoped privileges (for future multi-workshop support)
 */

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// Types and Interfaces
// ============================================

export interface PrivilegeInfo {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
}

export interface EffectivePrivilege extends PrivilegeInfo {
  source: 'ROLE' | 'OVERRIDE';
  sourceRole?: {
    id: string;
    code: string;
    name: string;
  };
  isOverride: boolean;
  grantedBy?: string;
  maxAmount?: number;
  workshopScope: boolean;
  workshopId?: string;
}

export interface UserPrivilegeCheck {
  userId: string;
  privilegeCode: string;
  hasPrivilege: boolean;
  source: 'ROLE' | 'OVERRIDE' | 'NONE';
  details?: {
    roleName?: string;
    overrideReason?: string;
    maxAmount?: number;
    workshopScope?: boolean;
  };
}

export interface PrivilegeCheckOptions {
  workshopId?: string;
  checkAmount?: number;
  ignoreOverrides?: boolean;
}

// ============================================
// Core Privilege Functions
// ============================================

/**
 * Get all effective privileges for a user
 * Combines privileges from roles and applies user-specific overrides
 * 
 * @param userId - The user ID to get privileges for
 * @param options - Optional filters like workshopId
 * @returns Array of effective privileges
 */
export async function getUserPrivileges(
  userId: string,
  options?: { workshopId?: string }
): Promise<EffectivePrivilege[]> {
  const now = new Date();
  const { workshopId } = options || {};

  // Get user's active roles with valid date ranges
  const userRoles = await db.userRole.findMany({
    where: {
      userId,
      isActive: true,
      role: { isActive: true },
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gte: now } },
      ],
    },
    include: {
      role: {
        include: {
          privileges: {
            where: { isGranted: true },
            include: {
              privilege: true,
            },
          },
        },
      },
    },
  });

  // Collect privileges from roles
  const rolePrivilegesMap = new Map<string, EffectivePrivilege>();

  for (const userRole of userRoles) {
    // Filter by workshop if specified
    if (workshopId && userRole.workshopId && userRole.workshopId !== workshopId) {
      continue;
    }

    for (const rp of userRole.role.privileges) {
      const priv = rp.privilege;
      if (!priv.isActive) continue;

      // Filter by workshop scope if specified
      if (workshopId && rp.workshopScope && userRole.workshopId !== workshopId) {
        continue;
      }

      const existing = rolePrivilegesMap.get(priv.code);
      
      // Only add if not already present or if this role has higher level
      if (!existing || userRole.role.level > (existing.sourceRole?.name ? 0 : 0)) {
        rolePrivilegesMap.set(priv.code, {
          id: priv.id,
          code: priv.code,
          name: priv.name,
          category: priv.category,
          description: priv.description,
          isActive: priv.isActive,
          source: 'ROLE',
          sourceRole: {
            id: userRole.role.id,
            code: userRole.role.code,
            name: userRole.role.name,
          },
          isOverride: false,
          maxAmount: rp.maxAmount ? Number(rp.maxAmount) : undefined,
          workshopScope: rp.workshopScope,
          workshopId: userRole.workshopId || undefined,
        });
      }
    }
  }

  // Get user's privilege overrides
  const overrides = await db.userPrivilegeOverride.findMany({
    where: {
      userId,
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gte: now } },
      ],
    },
    include: {
      privilege: true,
    },
  });

  // Apply overrides
  for (const override of overrides) {
    const priv = override.privilege;
    if (!priv.isActive) continue;

    if (override.isGranted) {
      // Grant override - add or replace
      rolePrivilegesMap.set(priv.code, {
        id: priv.id,
        code: priv.code,
        name: priv.name,
        category: priv.category,
        description: priv.description,
        isActive: priv.isActive,
        source: 'OVERRIDE',
        isOverride: true,
        grantedBy: override.grantedBy,
        workshopScope: false,
      });
    } else {
      // Revoke override - remove the privilege
      rolePrivilegesMap.delete(priv.code);
    }
  }

  return Array.from(rolePrivilegesMap.values());
}

/**
 * Check if a user has a specific privilege
 * 
 * @param userId - The user ID to check
 * @param privilegeCode - The privilege code to check for
 * @param options - Optional check options (workshop, amount, etc.)
 * @returns True if user has the privilege
 */
export async function hasPrivilege(
  userId: string,
  privilegeCode: string,
  options?: PrivilegeCheckOptions
): Promise<boolean> {
  const check = await checkPrivilege(userId, privilegeCode, options);
  return check.hasPrivilege;
}

/**
 * Detailed privilege check with source information
 * 
 * @param userId - The user ID to check
 * @param privilegeCode - The privilege code to check for
 * @param options - Optional check options
 * @returns Detailed check result
 */
export async function checkPrivilege(
  userId: string,
  privilegeCode: string,
  options?: PrivilegeCheckOptions
): Promise<UserPrivilegeCheck> {
  const { workshopId, checkAmount, ignoreOverrides } = options || {};
  const now = new Date();

  // First, check privilege overrides (unless ignored)
  if (!ignoreOverrides) {
    const override = await db.userPrivilegeOverride.findFirst({
      where: {
        userId,
        privilege: { code: privilegeCode },
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } },
        ],
      },
      include: {
        privilege: true,
      },
    });

    if (override) {
      return {
        userId,
        privilegeCode,
        hasPrivilege: override.isGranted,
        source: 'OVERRIDE',
        details: {
          overrideReason: override.reason || undefined,
        },
      };
    }
  }

  // Check role-based privileges
  const userRoleWithPrivilege = await db.userRole.findFirst({
    where: {
      userId,
      isActive: true,
      role: {
        isActive: true,
        privileges: {
          some: {
            privilege: { code: privilegeCode },
            isGranted: true,
          },
        },
      },
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gte: now } },
      ],
      // Filter by workshop if specified
      ...(workshopId ? {
        OR: [
          { workshopId: null },
          { workshopId },
        ],
      } : {}),
    },
    include: {
      role: {
        include: {
          privileges: {
            where: {
              privilege: { code: privilegeCode },
              isGranted: true,
            },
            include: {
              privilege: true,
            },
          },
        },
      },
    },
  });

  if (userRoleWithPrivilege) {
    const privilege = userRoleWithPrivilege.role.privileges[0];
    
    // Check workshop scope
    if (workshopId && privilege?.workshopScope) {
      if (userRoleWithPrivilege.workshopId && userRoleWithPrivilege.workshopId !== workshopId) {
        return {
          userId,
          privilegeCode,
          hasPrivilege: false,
          source: 'NONE',
        };
      }
    }

    // Check max amount if specified
    if (checkAmount !== undefined && privilege?.maxAmount) {
      const maxAmount = Number(privilege.maxAmount);
      if (checkAmount > maxAmount) {
        return {
          userId,
          privilegeCode,
          hasPrivilege: false,
          source: 'ROLE',
          details: {
            roleName: userRoleWithPrivilege.role.name,
            maxAmount,
          },
        };
      }
    }

    return {
      userId,
      privilegeCode,
      hasPrivilege: true,
      source: 'ROLE',
      details: {
        roleName: userRoleWithPrivilege.role.name,
        maxAmount: privilege?.maxAmount ? Number(privilege.maxAmount) : undefined,
        workshopScope: privilege?.workshopScope,
      },
    };
  }

  return {
    userId,
    privilegeCode,
    hasPrivilege: false,
    source: 'NONE',
  };
}

/**
 * Check if user has any of the specified privileges
 * 
 * @param userId - The user ID to check
 * @param privilegeCodes - Array of privilege codes to check
 * @param options - Optional check options
 * @returns True if user has any of the privileges
 */
export async function hasAnyPrivilege(
  userId: string,
  privilegeCodes: string[],
  options?: PrivilegeCheckOptions
): Promise<boolean> {
  if (privilegeCodes.length === 0) return false;

  const privileges = await getUserPrivileges(userId, options);
  const privilegeCodeSet = new Set(privilegeCodes);
  
  return privileges.some(p => privilegeCodeSet.has(p.code));
}

/**
 * Check if user has all of the specified privileges
 * 
 * @param userId - The user ID to check
 * @param privilegeCodes - Array of privilege codes to check
 * @param options - Optional check options
 * @returns True if user has all of the privileges
 */
export async function hasAllPrivileges(
  userId: string,
  privilegeCodes: string[],
  options?: PrivilegeCheckOptions
): Promise<boolean> {
  if (privilegeCodes.length === 0) return true;

  const privileges = await getUserPrivileges(userId, options);
  const userPrivilegeCodes = new Set(privileges.map(p => p.code));
  
  return privilegeCodes.every(code => userPrivilegeCodes.has(code));
}

/**
 * Get all users who have a specific privilege
 * Useful for notifications and approvals
 * 
 * @param privilegeCode - The privilege code to search for
 * @param options - Optional filters
 * @returns Array of users with the privilege
 */
export async function getUsersWithPrivilege(
  privilegeCode: string,
  options?: {
    workshopId?: string;
    activeOnly?: boolean;
  }
): Promise<Array<{
  id: string;
  email: string;
  name: string;
  department: string | null;
  source: 'ROLE' | 'OVERRIDE';
  roleName?: string;
}>> {
  const { workshopId, activeOnly = true } = options || {};
  const now = new Date();

  // Get privilege ID
  const privilege = await db.privilegeDefinition.findUnique({
    where: { code: privilegeCode },
  });

  if (!privilege) {
    return [];
  }

  // Users with direct privilege override
  const usersWithOverride = await db.userPrivilegeOverride.findMany({
    where: {
      privilegeId: privilege.id,
      isGranted: true,
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gte: now } },
      ],
      user: activeOnly ? { isActive: true } : undefined,
    },
    include: {
      user: true,
    },
  });

  // Users with role-based privilege
  const usersWithRolePrivilege = await db.userRole.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gte: now } },
      ],
      role: {
        isActive: true,
        privileges: {
          some: {
            privilegeId: privilege.id,
            isGranted: true,
          },
        },
      },
      user: activeOnly ? { isActive: true } : undefined,
      // Filter by workshop if specified
      ...(workshopId ? {
        OR: [
          { workshopId: null },
          { workshopId },
        ],
      } : {}),
    },
    include: {
      user: true,
      role: true,
    },
  });

  // Combine and deduplicate results
  const userMap = new Map<string, {
    id: string;
    email: string;
    name: string;
    department: string | null;
    source: 'ROLE' | 'OVERRIDE';
    roleName?: string;
  }>();

  // Add users with overrides
  for (const override of usersWithOverride) {
    userMap.set(override.user.id, {
      id: override.user.id,
      email: override.user.email,
      name: override.user.name,
      department: override.user.department,
      source: 'OVERRIDE',
    });
  }

  // Add users with role-based privileges (but don't override existing overrides)
  for (const ur of usersWithRolePrivilege) {
    if (!userMap.has(ur.user.id)) {
      userMap.set(ur.user.id, {
        id: ur.user.id,
        email: ur.user.email,
        name: ur.user.name,
        department: ur.user.department,
        source: 'ROLE',
        roleName: ur.role.name,
      });
    }
  }

  return Array.from(userMap.values());
}

/**
 * Get user's privilege summary for display
 * 
 * @param userId - The user ID
 * @returns Privilege summary grouped by category
 */
export async function getUserPrivilegeSummary(
  userId: string
): Promise<{
  categories: Record<string, EffectivePrivilege[]>;
  totalPrivileges: number;
  roleCount: number;
  overrideCount: number;
}> {
  const [privileges, userRoles, overrides] = await Promise.all([
    getUserPrivileges(userId),
    db.userRole.count({
      where: {
        userId,
        isActive: true,
        role: { isActive: true },
      },
    }),
    db.userPrivilegeOverride.count({
      where: {
        userId,
        isGranted: true,
      },
    }),
  ]);

  const categories: Record<string, EffectivePrivilege[]> = {};
  
  for (const priv of privileges) {
    if (!categories[priv.category]) {
      categories[priv.category] = [];
    }
    categories[priv.category].push(priv);
  }

  return {
    categories,
    totalPrivileges: privileges.length,
    roleCount: userRoles,
    overrideCount: overrides,
  };
}

/**
 * Grant a privilege override to a user
 * 
 * @param userId - User to grant privilege to
 * @param privilegeCode - Privilege code to grant
 * @param grantedBy - User ID who granted the privilege
 * @param options - Optional settings (reason, validity period)
 */
export async function grantPrivilegeOverride(
  userId: string,
  privilegeCode: string,
  grantedBy: string,
  options?: {
    reason?: string;
    validFrom?: Date;
    validTo?: Date;
  }
): Promise<void> {
  const privilege = await db.privilegeDefinition.findUnique({
    where: { code: privilegeCode },
  });

  if (!privilege) {
    throw new Error(`Privilege not found: ${privilegeCode}`);
  }

  await db.userPrivilegeOverride.upsert({
    where: {
      id: `${userId}_${privilege.id}`,
    },
    create: {
      userId,
      privilegeId: privilege.id,
      isGranted: true,
      reason: options?.reason,
      grantedBy,
      validFrom: options?.validFrom || new Date(),
      validTo: options?.validTo,
    },
    update: {
      isGranted: true,
      reason: options?.reason,
      validFrom: options?.validFrom || new Date(),
      validTo: options?.validTo,
      grantedBy,
    },
  });
}

/**
 * Revoke a privilege from a user (either override or future role check)
 * 
 * @param userId - User to revoke privilege from
 * @param privilegeCode - Privilege code to revoke
 * @param grantedBy - User ID who is revoking the privilege
 * @param reason - Reason for revocation
 */
export async function revokePrivilegeOverride(
  userId: string,
  privilegeCode: string,
  grantedBy: string,
  reason?: string
): Promise<void> {
  const privilege = await db.privilegeDefinition.findUnique({
    where: { code: privilegeCode },
  });

  if (!privilege) {
    throw new Error(`Privilege not found: ${privilegeCode}`);
  }

  await db.userPrivilegeOverride.upsert({
    where: {
      id: `${userId}_${privilege.id}`,
    },
    create: {
      userId,
      privilegeId: privilege.id,
      isGranted: false,
      reason,
      grantedBy,
    },
    update: {
      isGranted: false,
      reason,
      grantedBy,
    },
  });
}

/**
 * Batch check multiple privileges for a user
 * 
 * @param userId - The user ID to check
 * @param privilegeCodes - Array of privilege codes to check
 * @param options - Optional check options
 * @returns Object with privilege code as key and hasPrivilege as value
 */
export async function batchCheckPrivileges(
  userId: string,
  privilegeCodes: string[],
  options?: PrivilegeCheckOptions
): Promise<Record<string, boolean>> {
  const privileges = await getUserPrivileges(userId, options);
  const userPrivilegeCodes = new Set(privileges.map(p => p.code));
  
  const result: Record<string, boolean> = {};
  for (const code of privilegeCodes) {
    result[code] = userPrivilegeCodes.has(code);
  }
  
  return result;
}

/**
 * Check if a privilege code is valid
 * 
 * @param privilegeCode - The privilege code to validate
 * @returns True if the privilege exists and is active
 */
export async function isValidPrivilege(privilegeCode: string): Promise<boolean> {
  const privilege = await db.privilegeDefinition.findUnique({
    where: { code: privilegeCode },
    select: { isActive: true },
  });
  
  return privilege?.isActive ?? false;
}

/**
 * Get all privilege definitions grouped by category
 * 
 * @param activeOnly - Only return active privileges
 * @returns Privileges grouped by category
 */
export async function getAllPrivilegesByCategory(
  activeOnly: boolean = true
): Promise<Record<string, PrivilegeInfo[]>> {
  const privileges = await db.privilegeDefinition.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [
      { category: 'asc' },
      { code: 'asc' },
    ],
  });

  const categories: Record<string, PrivilegeInfo[]> = {};
  
  for (const priv of privileges) {
    if (!categories[priv.category]) {
      categories[priv.category] = [];
    }
    categories[priv.category].push({
      id: priv.id,
      code: priv.code,
      name: priv.name,
      category: priv.category,
      description: priv.description,
      isActive: priv.isActive,
    });
  }

  return categories;
}
