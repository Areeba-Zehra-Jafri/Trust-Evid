import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
  const { id, evidenceId } = await params;
  const { supabase, user } = await requireAal2User();
  const body = await req.json().catch(() => ({}));
  const state = ['needs_review','in_review','reviewed','flagged'].includes(body.state) ? body.state : 'in_review';
  const priority = ['low','normal','high','critical'].includes(body.priority) ? body.priority : 'normal';
  const { data, error } = await supabase.from('evidence_reviews').upsert({ case_id: id, evidence_id: evidenceId, reviewer_id: user.id, state, priority, summary: String(body.summary ?? ''), limitations: Array.isArray(body.limitations) ? body.limitations : [] }, { onConflict: 'evidence_id,reviewer_id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.rpc('record_custody_event', { p_case_id: id, p_evidence_id: evidenceId, p_event_type: 'review', p_details: { state, priority } });
  return NextResponse.json({ review: data });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
