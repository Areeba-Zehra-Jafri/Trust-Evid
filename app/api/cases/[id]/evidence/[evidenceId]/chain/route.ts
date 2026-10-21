import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const { id, evidenceId } = await params;
  let auth: Awaited<ReturnType<typeof requireAal2User>>;
  try { auth = await requireAal2User(); } catch (e) { if (e instanceof Response) return e; throw e; }
  const { supabase } = auth;
  const { data, error } = await supabase.rpc('verify_custody_chain', { p_case_id: id, p_evidence_id: evidenceId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
