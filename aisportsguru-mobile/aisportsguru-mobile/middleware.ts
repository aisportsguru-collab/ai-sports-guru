import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Protect pages, but NEVER redirect API routes.
 * This lets mobile apps call /api/* with Authorization: Bearer <supabase_jwt>
 * without getting HTML redirects.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow API and static assets
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Read Supabase session cookie set by your web app
  const hasSession = Boolean(req.cookies.get('sb-access-token')?.value);

  // Public pages allowed without session
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/sign-in');

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match everything except static assets; API is handled in code above
export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(png|jpg|jpeg|gif|svg|ico)).*)'],
};
