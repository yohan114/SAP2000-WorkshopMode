'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Custom hook for authentication state and actions
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isUnauthenticated = status === 'unauthenticated';

  const user = session?.user;

  const login = useCallback(async (email: string, password: string, callbackUrl?: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl || '/',
    });

    if (result?.ok) {
      router.push(callbackUrl || '/');
      router.refresh();
    }

    return result;
  }, [router]);

  const logout = useCallback(async (callbackUrl?: string) => {
    await signOut({ redirect: false });
    router.push(callbackUrl || '/login');
    router.refresh();
  }, [router]);

  const hasRole = useCallback((roleCode: string) => {
    return user?.roles?.some(r => r.code === roleCode) ?? false;
  }, [user?.roles]);

  const hasAnyRole = useCallback((roleCodes: string[]) => {
    return user?.roles?.some(r => roleCodes.includes(r.code)) ?? false;
  }, [user?.roles]);

  const hasPrivilege = useCallback((privilegeCode: string) => {
    return user?.privileges?.includes(privilegeCode) ?? false;
  }, [user?.privileges]);

  const hasAnyPrivilege = useCallback((privilegeCodes: string[]) => {
    return privilegeCodes.some(p => user?.privileges?.includes(p)) ?? false;
  }, [user?.privileges]);

  const isAdmin = useCallback(() => {
    return hasAnyRole(['ADMIN', 'CTRL_MGR']);
  }, [hasAnyRole]);

  const isSupervisor = useCallback(() => {
    return user?.roles?.some(r => r.level >= 2) ?? false;
  }, [user?.roles]);

  const isManager = useCallback(() => {
    return user?.roles?.some(r => r.level >= 4) ?? false;
  }, [user?.roles]);

  return {
    // State
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,

    // Actions
    login,
    logout,
    updateSession: update,

    // Permission checks
    hasRole,
    hasAnyRole,
    hasPrivilege,
    hasAnyPrivilege,
    isAdmin,
    isSupervisor,
    isManager,
  };
}

/**
 * Hook to check if user has specific permission, redirects if not
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  if (!auth.isLoading && !auth.isAuthenticated) {
    router.push('/login');
  }

  return auth;
}

/**
 * Hook to require specific role
 */
export function useRequireRole(roleCode: string) {
  const auth = useAuth();
  const router = useRouter();

  if (!auth.isLoading && (!auth.isAuthenticated || !auth.hasRole(roleCode))) {
    router.push('/unauthorized');
  }

  return auth;
}
