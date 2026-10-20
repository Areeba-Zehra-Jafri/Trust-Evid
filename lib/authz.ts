import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function requireAal2User(req: Request) {
  const res = new Response();
  const supabase = createServerClient({ req, res, env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }});

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const { data: { currentLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (currentLevel !== 'aal2') {
    throw new Response('Forbidden', { status: 403 });
  }

  return { user };
}

export async function requireCaseRole(caseId: string, userId: string, allowedRoles: string[]) {
  const supabaseAdmin = createServerClient({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  });

  const { data, error } = await supabaseAdmin
    .from('case_members')
    .select('role')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  if (!allowedRoles.includes(data.role)) return null;
  return data.role;
}
