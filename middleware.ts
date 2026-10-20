import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/mfa/enroll',
  '/auth/mfa/verify',
  '/api/health',
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const supabase = createServerClient({ req, res: NextResponse.next() });
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect to login if no user
  if (error || !user) {
    if (url.pathname !== '/auth/login') {
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Check AAL levels
  const { data: { currentLevel, nextLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (currentLevel === 'aal1' && nextLevel === 'aal2') {
    // user enrolled in TOTP but not verified this session
    if (url.pathname !== '/auth/mfa/verify') {
      url.pathname = '/auth/mfa/verify';
      return NextResponse.redirect(url);
    }
  } else if (currentLevel === 'aal1' && nextLevel === 'aal1') {
    // user has no enrolled second factor
    if (url.pathname !== '/auth/mfa/enroll') {
      url.pathname = '/auth/mfa/enroll';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/cases/:path*', '/auth/mfa/:path*'],
};
