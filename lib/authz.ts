import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function requireAal2User() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Response('Unauthorized', { status: 401 });
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.currentLevel !== 'aal2') throw new Response('Forbidden', { status: 403 });
  return { user, supabase };
}

export async function requireCaseRole(caseId: string, userId: string, allowedRoles: string[]) {
  const { data, error } = await supabaseAdmin.from('case_members').select('role').eq('case_id', caseId).eq('user_id', userId).maybeSingle();
  if (error || !data || !allowedRoles.includes(data.role)) return null;
  return data.role;
}
