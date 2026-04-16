import { NextResponse, type NextRequest } from 'next/server';
import {
  getSessionCookieName,
  verifySessionToken,
} from '@/lib/auth/session';

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-app-session');
  if (!token) return;
  const existingSession = request.cookies.get(getSessionCookieName())?.value;
  if (existingSession) return;
  request.cookies.set(getSessionCookieName(), token);
}

// All protected application routes
const PROTECTED_PATHS = [
  '/dashboard',
  '/clients',
  '/leads',
  '/tasks',
  '/activities',
  '/settings',
  '/staff',
  '/products',
  '/invoices',
  '/subscriptions',
  '/tickets',
  '/roles',
  '/marketing',
  '/add-client',
  '/projects',
  '/companies',
];

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  const nextResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Security headers
  nextResponse.headers.set('X-Content-Type-Options', 'nosniff');
  nextResponse.headers.set('X-XSS-Protection', '1; mode=block');
  nextResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  nextResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return nextResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
