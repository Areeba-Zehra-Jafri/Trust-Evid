import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from './supabase/server';

export async function requireAal2User(request: Request) {
  const { data: { session }, error } = await supabaseServer.auth.getSession({ req: request });
  if (error || !session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: { currentLevel, nextLevel } } = await supabaseServer.auth.mfa.getAuthenticatorAssuranceLevel({
    headers: request.headers,
  });

  if (currentLevel !== 'aal2') {
    return NextResponse.json({ error: 'Two-factor authentication required' }, { status: 403 });
  }

  return session.user;
}

export async function requireCaseRole(caseId: string, userId: string, allowedRoles: string[]) {
  const { data, error } = await supabaseAdmin
    .from('case_members')
    .select('role')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  if (!allowedRoles.includes(data.role)) {
    return null;
  }

  return data.role;
}
