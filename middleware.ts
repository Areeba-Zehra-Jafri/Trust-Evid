import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseServer } from './lib/supabase/server';

const protectedPaths = ['/dashboard', '/cases'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const { data: { session }, error } = await supabaseServer.auth.getSession({
    req: request,
  });

  if (error || !session) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const aal = session.access_token ? parseAalFromJwt(session.access_token) : null;

  if (aal !== 'aal2') {
    // Check if user has verified MFA factors
    const { data: factorsData, error: factorsError } = await supabaseServer.auth.getUserFactors();
    if (factorsError) {
      // On error, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    const hasMfa = factorsData?.length > 0;
    if (!hasMfa) {
      // Redirect to enroll if no MFA factors
      const enrollUrl = new URL('/auth/mfa/enroll', request.url);
      return NextResponse.redirect(enrollUrl);
    } else {
      // Redirect to verify if MFA factors exist
      const verifyUrl = new URL('/auth/mfa/verify', request.url);
      return NextResponse.redirect(verifyUrl);
    }
  }

  return NextResponse.next();
}

function parseAalFromJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded.aal || null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/dashboard', '/cases/:path*'],
};
