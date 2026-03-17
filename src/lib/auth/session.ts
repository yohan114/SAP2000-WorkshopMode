import { getServerSession } from 'next-auth';
import { authOptions } from './options';

// User type from session
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  employeeId?: string | null;
  department?: string | null;
  roles: Array<{ code: string; name: string; level: number }>;
  privileges: string[];
};

/**
 * Get the current session on the server side
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Require a specific role - throws if user doesn't have it
 */
export async function requireRole(roleCode: string): Promise<SessionUser> {
  const user = await requireAuth();
  const hasRole = user.roles.some((r) => r.code === roleCode);
  if (!hasRole) {
    throw new Error('Forbidden: Insufficient role');
  }
  return user;
}

/**
 * Require a specific privilege - throws if user doesn't have it
 */
export async function requirePrivilege(privilegeCode: string): Promise<SessionUser> {
  const user = await requireAuth();
  const hasPrivilege = user.privileges.includes(privilegeCode);
  if (!hasPrivilege) {
    throw new Error('Forbidden: Insufficient privileges');
  }
  return user;
}

/**
 * Require any of the specified privileges
 */
export async function requireAnyPrivilege(privilegeCodes: string[]): Promise<SessionUser> {
  const user = await requireAuth();
  const hasPrivilege = privilegeCodes.some((p) => user.privileges.includes(p));
  if (!hasPrivilege) {
    throw new Error('Forbidden: Insufficient privileges');
  }
  return user;
}

/**
 * Check if user has a specific privilege (returns boolean)
 */
export async function hasPrivilege(privilegeCode: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.privileges.includes(privilegeCode);
}

/**
 * Check if user has a specific role (returns boolean)
 */
export async function hasRole(roleCode: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.roles.some((r) => r.code === roleCode);
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: SessionUser): boolean {
  return user.roles.some((r) => r.code === 'ADMIN' || r.code === 'CTRL_MGR');
}

/**
 * Check if user is a supervisor or higher (level >= 2)
 */
export function isSupervisor(user: SessionUser): boolean {
  return user.roles.some((r) => r.level >= 2);
}

/**
 * Check if user is a manager or higher (level >= 4)
 */
export function isManager(user: SessionUser): boolean {
  return user.roles.some((r) => r.level >= 4);
}

/**
 * Check if user is at least a technician
 */
export function isTechnician(user: SessionUser): boolean {
  return user.roles.some((r) => r.level >= 1);
}
