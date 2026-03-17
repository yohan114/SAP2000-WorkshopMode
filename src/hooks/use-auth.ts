'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

/**
 * Hook to access the current session and authentication status
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isUnauthenticated = status === 'unauthenticated';

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    user: session?.user,
    update,
  };
}

/**
 * Hook to check if user has a specific privilege
 */
export function useHasPrivilege(privilegeCode: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.privileges.includes(privilegeCode);
}

/**
 * Hook to check if user has any of the specified privileges
 */
export function useHasAnyPrivilege(privilegeCodes: string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return privilegeCodes.some((code) => user.privileges.includes(code));
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(roleCode: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.roles.some((r) => r.code === roleCode);
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roleCodes: string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return roleCodes.some((code) => user.roles.some((r) => r.code === code));
}

/**
 * Hook to check if user is an admin
 */
export function useIsAdmin(): boolean {
  return useHasAnyRole(['ADMIN', 'CTRL_MGR']);
}

/**
 * Hook to check if user is a supervisor or higher
 */
export function useIsSupervisor(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.roles.some((r) => r.level >= 2);
}

/**
 * Hook for login functionality
 */
export function useLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string, callbackUrl?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
          return false;
        }

        if (result?.ok) {
          router.push(callbackUrl || '/');
          router.refresh();
          return true;
        }

        return false;
      } catch (err) {
        setError('An unexpected error occurred');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return { login, isLoading, error, setError };
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(
    async (callbackUrl?: string) => {
      setIsLoading(true);

      try {
        await signOut({ redirect: false });
        router.push(callbackUrl || '/login');
        router.refresh();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return { logout, isLoading };
}

/**
 * Hook for requiring authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  if (!isLoading && !isAuthenticated) {
    router.push(redirectTo);
  }

  return { isAuthenticated, isLoading, user };
}

/**
 * Hook for requiring a specific privilege
 * Returns true/false and handles UI feedback
 */
export function useRequirePrivilege(privilegeCode: string): {
  hasPrivilege: boolean;
  isLoading: boolean;
} {
  const { isLoading, isAuthenticated } = useAuth();
  const hasPrivilege = useHasPrivilege(privilegeCode);

  return {
    hasPrivilege: isAuthenticated && hasPrivilege,
    isLoading,
  };
}

/**
 * Hook for requiring a specific role
 */
export function useRequireRole(roleCode: string): {
  hasRole: boolean;
  isLoading: boolean;
} {
  const { isLoading, isAuthenticated } = useAuth();
  const hasRole = useHasRole(roleCode);

  return {
    hasRole: isAuthenticated && hasRole,
    isLoading,
  };
}
