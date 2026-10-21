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

  if (PUBLIC_PATHS.some((path) => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const redirectTo = (pathname: string, withReturn = false) => {
    const target = req.nextUrl.clone();
    target.pathname = pathname;
    target.search = '';
    if (withReturn) target.searchParams.set('redirect', req.nextUrl.pathname);
    const redirectRes = NextResponse.redirect(target);
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirectTo('/auth/login', true);
  }

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aal) {
    return redirectTo('/auth/login', true);
  }

  if (aal.currentLevel === 'aal2') {
    return res;
  }

  if (aal.nextLevel === 'aal2') {
    return redirectTo('/auth/mfa/verify');
  }

  return redirectTo('/auth/mfa/enroll');
}

export const config = {
  matcher: ['/dashboard/:path*', '/cases/:path*'],
};
