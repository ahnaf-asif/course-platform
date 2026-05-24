import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token');

  // Protect admin and dashboard routes
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');

  if (isProtectedRoute && !refreshToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect from login/register if already authenticated
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  if (isAuthRoute && refreshToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};
