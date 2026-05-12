import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

/**
 * Standard API Response Types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Success response helper
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  );
}

/**
 * Paginated success response helper
 */
export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * Error response helper
 */
export function apiError(
  error: string,
  status: number = 400,
  message?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, message },
    { status }
  );
}

/**
 * Validation error helper
 */
export function apiValidationError(error: ZodError): NextResponse<ApiResponse> {
  const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
  return NextResponse.json(
    { 
      success: false, 
      error: 'Validation failed', 
      message: messages.join(', ') 
    },
    { status: 400 }
  );
}

/**
 * Not found response helper
 */
export function apiNotFound(resource: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: 'Not found', message: `${resource} not found` },
    { status: 404 }
  );
}

/**
 * Unauthorized response helper
 */
export function apiUnauthorized(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: 'Unauthorized', message },
    { status: 401 }
  );
}

/**
 * Forbidden response helper
 */
export function apiForbidden(message: string = 'Forbidden'): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: 'Forbidden', message },
    { status: 403 }
  );
}

/**
 * Parse pagination parameters from URL
 */
export function parsePagination(url: URL): PaginatedParams {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const search = url.searchParams.get('search') || undefined;
  const sortBy = url.searchParams.get('sortBy') || undefined;
  const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    search,
    sortBy,
    sortOrder,
  };
}

/**
 * Generate a unique ID (CUID-like)
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

/**
 * Generate document number
 */
export function generateDocumentNumber(prefix: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = sequence.toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

/**
 * Calculate pagination skip value
 */
export function getSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Date range filter helper
 */
export function getDateRangeFilter(
  startDate?: string,
  endDate?: string
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) return undefined;
  
  const filter: Record<string, unknown> = {};
  
  if (startDate && endDate) {
    filter.gte = new Date(startDate);
    filter.lte = new Date(endDate);
  } else if (startDate) {
    filter.gte = new Date(startDate);
  } else if (endDate) {
    filter.lte = new Date(endDate);
  }
  
  return filter;
}

/**
 * Get current authenticated user from session
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Check if user has a specific privilege
 */
export function hasPrivilege(user: { privileges: string[] } | null, privilegeCode: string): boolean {
  if (!user) return false;
  return user.privileges.includes(privilegeCode);
}

/**
 * Check if user has any of the specified privileges
 */
export function hasAnyPrivilege(user: { privileges: string[] } | null, privilegeCodes: string[]): boolean {
  if (!user) return false;
  return privilegeCodes.some(code => user.privileges.includes(code));
}

/**
 * Require authentication - returns user or throws unauthorized response
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Require specific privilege - returns user or throws forbidden response
 */
export async function requirePrivilege(privilegeCode: string) {
  const user = await requireAuth();
  if (!hasPrivilege(user, privilegeCode)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Require any of the specified privileges
 */
export async function requireAnyPrivilege(privilegeCodes: string[]) {
  const user = await requireAuth();
  if (!hasAnyPrivilege(user, privilegeCodes)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Handle API errors including auth errors
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return apiUnauthorized('Authentication required');
    }
    if (error.message === 'FORBIDDEN') {
      return apiForbidden('You do not have permission to perform this action');
    }
  }
  console.error('API error:', error);
  return apiError('An unexpected error occurred', 500);
}
