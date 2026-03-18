'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// ============================================
// Types
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

export interface PrivilegeCheckResult {
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

interface PrivilegeCheckResponse {
  data: PrivilegeCheckResult | { hasAccess: boolean } | Record<string, boolean>;
  meta?: {
    total: number;
    granted: number;
    denied: number;
  };
}

interface UsePrivilegesOptions {
  workshopId?: string;
  autoFetch?: boolean;
}

interface UsePrivilegesReturn {
  // State
  privileges: EffectivePrivilege[];
  isLoading: boolean;
  error: string | null;
  
  // Computed
  privilegeCodes: string[];
  privilegeCategories: Record<string, EffectivePrivilege[]>;
  
  // Helper functions
  can: (privilegeCode: string) => boolean;
  canAny: (privilegeCodes: string[]) => boolean;
  canAll: (privilegeCodes: string[]) => boolean;
  
  // Async check functions (for server-side validation)
  checkPrivilege: (privilegeCode: string, checkAmount?: number) => Promise<PrivilegeCheckResult | null>;
  checkMultiple: (privilegeCodes: string[], mode?: 'any' | 'all' | 'batch') => Promise<PrivilegeCheckResponse | null>;
  
  // Utilities
  refresh: () => Promise<void>;
  clearCache: () => void;
}

// ============================================
// Cache
// ============================================

const CACHE_KEY_PREFIX = 'wcp_privileges_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedPrivileges {
  privileges: EffectivePrivilege[];
  timestamp: number;
  workshopId?: string;
}

function getCacheKey(userId: string, workshopId?: string): string {
  return `${CACHE_KEY_PREFIX}${userId}${workshopId ? `_${workshopId}` : ''}`;
}

function getCachedPrivileges(userId: string, workshopId?: string): EffectivePrivilege[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getCacheKey(userId, workshopId);
    const cached = sessionStorage.getItem(key);
    
    if (cached) {
      const parsed: CachedPrivileges = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - parsed.timestamp < CACHE_DURATION) {
        return parsed.privileges;
      }
    }
  } catch (e) {
    console.warn('Failed to read privilege cache:', e);
  }
  
  return null;
}

function setCachedPrivileges(userId: string, privileges: EffectivePrivilege[], workshopId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(userId, workshopId);
    const cache: CachedPrivileges = {
      privileges,
      timestamp: Date.now(),
      workshopId,
    };
    sessionStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to write privilege cache:', e);
  }
}

function clearCachedPrivileges(userId: string, workshopId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(userId, workshopId);
    sessionStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to clear privilege cache:', e);
  }
}

// ============================================
// Hook
// ============================================

/**
 * Main hook for privilege checking on the frontend
 * 
 * @param options Configuration options
 * @returns Privilege state and helper functions
 */
export function usePrivileges(options: UsePrivilegesOptions = {}): UsePrivilegesReturn {
  const { workshopId, autoFetch = true } = options;
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const isAuthenticated = status === 'authenticated';
  
  const [privileges, setPrivileges] = useState<EffectivePrivilege[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived values
  const privilegeCodes = useMemo(() => 
    privileges.map(p => p.code), 
    [privileges]
  );
  
  const privilegeCategories = useMemo(() => 
    privileges.reduce<Record<string, EffectivePrivilege[]>>((acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = [];
      }
      acc[p.category].push(p);
      return acc;
    }, {}),
    [privileges]
  );

  // Fetch privileges from API
  const fetchPrivileges = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setPrivileges([]);
      return;
    }

    // Check cache first
    const cached = getCachedPrivileges(userId, workshopId);
    if (cached) {
      setPrivileges(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      if (workshopId) {
        params.append('workshopId', workshopId);
      }

      const response = await fetch(`/api/privileges/check?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch privileges');
      }

      const result = await response.json();
      const fetchedPrivileges = result.data || [];
      
      setPrivileges(fetchedPrivileges);
      setCachedPrivileges(userId, fetchedPrivileges, workshopId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load privileges';
      setError(message);
      console.error('Failed to fetch privileges:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAuthenticated, workshopId]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchPrivileges();
    }
  }, [autoFetch, isAuthenticated, fetchPrivileges]);

  // Clear privileges when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setPrivileges([]);
      setError(null);
    }
  }, [isAuthenticated]);

  // Synchronous privilege checks (using cached data)
  const can = useCallback((privilegeCode: string): boolean => {
    return privilegeCodes.includes(privilegeCode);
  }, [privilegeCodes]);

  const canAny = useCallback((codes: string[]): boolean => {
    return codes.some(code => privilegeCodes.includes(code));
  }, [privilegeCodes]);

  const canAll = useCallback((codes: string[]): boolean => {
    return codes.every(code => privilegeCodes.includes(code));
  }, [privilegeCodes]);

  // Async privilege check (server-side validation)
  const checkPrivilege = useCallback(async (
    privilegeCode: string, 
    checkAmount?: number
  ): Promise<PrivilegeCheckResult | null> => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/privileges/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          privilegeCode,
          workshopId,
          checkAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check privilege');
      }

      const result = await response.json();
      return result.data as PrivilegeCheckResult;
    } catch (e) {
      console.error('Failed to check privilege:', e);
      return null;
    }
  }, [userId, workshopId]);

  const checkMultiple = useCallback(async (
    codes: string[],
    mode: 'any' | 'all' | 'batch' = 'any'
  ): Promise<PrivilegeCheckResponse | null> => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/privileges/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          privilegeCodes: codes,
          workshopId,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check privileges');
      }

      return await response.json();
    } catch (e) {
      console.error('Failed to check privileges:', e);
      return null;
    }
  }, [userId, workshopId]);

  // Refresh and clear cache
  const refresh = useCallback(async () => {
    if (userId) {
      clearCachedPrivileges(userId, workshopId);
    }
    await fetchPrivileges();
  }, [userId, workshopId, fetchPrivileges]);

  const clearCache = useCallback(() => {
    if (userId) {
      clearCachedPrivileges(userId, workshopId);
    }
  }, [userId, workshopId]);

  return {
    privileges,
    isLoading,
    error,
    privilegeCodes,
    privilegeCategories,
    can,
    canAny,
    canAll,
    checkPrivilege,
    checkMultiple,
    refresh,
    clearCache,
  };
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Simple hook to check a single privilege
 */
export function useCan(privilegeCode: string): boolean {
  const { can } = usePrivileges();
  return can(privilegeCode);
}

/**
 * Hook to check multiple privileges (any)
 */
export function useCanAny(privilegeCodes: string[]): boolean {
  const { canAny } = usePrivileges();
  return canAny(privilegeCodes);
}

/**
 * Hook to check multiple privileges (all)
 */
export function useCanAll(privilegeCodes: string[]): boolean {
  const { canAll } = usePrivileges();
  return canAll(privilegeCodes);
}

/**
 * Hook to check admin-level access
 */
export function useIsAdmin(): boolean {
  return useCanAny([
    'SYSTEM_ADMIN',
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'MANAGE_ALL_WORKSHOPS',
  ]);
}

/**
 * Hook to get user's privilege categories
 */
export function usePrivilegeCategories(): Record<string, EffectivePrivilege[]> {
  const { privilegeCategories } = usePrivileges();
  return privilegeCategories;
}

/**
 * Hook that returns privilege guards for UI rendering
 * Useful for conditional rendering based on permissions
 */
export function usePrivilegeGuard() {
  const { can, canAny, canAll, isLoading, privileges } = usePrivileges();

  return {
    isLoading,
    hasPrivileges: privileges.length > 0,
    
    // Guard functions that return children if authorized, null otherwise
    Guard: ({ privilege, children }: { privilege: string; children: React.ReactNode }) => 
      can(privilege) ? <>{children}</> : null,
    
    GuardAny: ({ privileges: codes, children }: { privileges: string[]; children: React.ReactNode }) => 
      canAny(codes) ? <>{children}</> : null,
    
    GuardAll: ({ privileges: codes, children }: { privileges: string[]; children: React.ReactNode }) => 
      canAll(codes) ? <>{children}</> : null,
    
    // Utility functions
    can,
    canAny,
    canAll,
  };
}

// Default export
export default usePrivileges;
