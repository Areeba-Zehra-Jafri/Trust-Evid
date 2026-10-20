import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './lib/supabase/types';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Paths that do not require auth
  const publicPaths = [
    '/auth/login',
    '/auth/signup',
    '/auth/mfa/enroll',
    '/auth/mfa/verify',
    '/api/health',
  ];

  if (publicPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
    return res;
  }

  const supabase = createMiddlewareSupabaseClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to login if no session
  if (!session) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check for AAL2 (TOTP verified)
  if (!session.user.aal2) {
    // Redirect to MFA enroll or verify
    const userHasFactors = session.user.factors && session.user.factors.length > 0;
    const redirectUrl = new URL(
      userHasFactors ? '/auth/mfa/verify' : '/auth/mfa/enroll',
      req.url
    );
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard', '/cases/:path*'],
};
