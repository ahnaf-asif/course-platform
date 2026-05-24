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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Handle already authenticated users on auth pages
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  if (isAuthRoute) {
    const refreshToken = request.cookies.get('refresh_token');
    if (refreshToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  // 2. Protect routes
  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // 3. Verify token and check roles for admin routes
  if (pathname.startsWith('/admin')) {
    try {
      const { payload } = await jose.jwtVerify(accessToken, getJwtSecretKey());
      if (payload.role !== 'ADMIN') {
        // Redirect non-admins from admin routes
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (err) {
      // This will catch expired tokens or invalid signatures
      console.error('JWT Verification Error:', err);
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      // We could also attempt a refresh here, but redirecting is simpler and safer
      return NextResponse.redirect(url);
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
