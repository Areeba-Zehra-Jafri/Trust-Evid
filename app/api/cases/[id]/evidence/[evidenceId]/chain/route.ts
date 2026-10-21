import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const { id, evidenceId } = await params;
  const { supabase } = await requireAal2User();
  const { data, error } = await supabase.rpc('verify_custody_chain', { p_case_id: id, p_evidence_id: evidenceId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
