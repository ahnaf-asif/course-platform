import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Helper function to get the JWT secret key
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`\n[Middleware] Path: ${pathname}`);

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // 1. Handle auth pages (login/register)
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  if (isAuthRoute) {
    if (accessToken) {
      console.log('[Middleware] Valid-looking access token found, redirecting from auth page to /dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  // 2. Protect routes
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  if (isProtectedRoute) {
    if (!accessToken && !refreshToken) {
      console.log('[Middleware] No tokens found. Redirecting to /login.');
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // 3. Verify token and check roles for admin routes
    if (pathname.startsWith('/admin')) {
      console.log('[Middleware] Admin route detected. Verifying token...');
      
      if (!accessToken) {
        console.log('[Middleware] Admin route requires access token. Redirecting to login for hydration.');
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }

      try {
        const { payload } = await jose.jwtVerify(accessToken, getJwtSecretKey());
        console.log('[Middleware] Token verified. Decoded Role:', payload.role);

        if (payload.role !== 'ADMIN') {
          console.log(`[Middleware] Role mismatch. Expected ADMIN, got ${payload.role}. Redirecting to /dashboard.`);
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        
        console.log('[Middleware] Admin access GRANTED.');
      } catch (err) {
        console.error('[Middleware] JWT Verification Error:', err);
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }
    }
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
