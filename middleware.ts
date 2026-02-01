import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/signin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('__session');

  // If no session and trying to access a protected route, redirect to signin
  if (!sessionCookie && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // If session exists and on signin page, redirect to home
  if (sessionCookie && pathname === '/signin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
