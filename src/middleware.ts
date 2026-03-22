import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public paths that don't require authentication
const publicPaths = [
  '/login',
  '/api/auth',
];

// Paths that should be excluded from auth checks
const excludedPaths = [
  '/_next',
  '/static',
  '/favicon',
  '/public',
];

// Static file extensions to always allow
const staticExtensions = [
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.css',
  '.js',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.webp',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // Allow excluded paths
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get the token with enhanced secret fallback
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({
    req: request,
    secret,
  });

  // Allow public paths (but if logged in and going to login, redirect to dashboard)
  if (publicPaths.some(path => pathname.startsWith(path))) {
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // For root path, check if user is authenticated
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check if user is authenticated for protected routes
  if (!token) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force password change if required
  const mustChangePassword = token.mustChangePassword === true;
  const changePasswordPaths = ['/dashboard/change-password', '/account/change-password'];

  if (mustChangePassword && !changePasswordPaths.some(path => pathname.startsWith(path))) {
    // Allow API routes that might need to check user status
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/dashboard/change-password', request.url));
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
