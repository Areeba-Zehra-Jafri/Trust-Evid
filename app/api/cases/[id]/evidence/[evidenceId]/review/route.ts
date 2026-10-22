import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
  const { id, evidenceId } = await params;
  const { supabase, user } = await requireAal2User();
  const body = await req.json().catch(() => ({}));
  const state = ['needs_review','in_review','reviewed','flagged'].includes(body.state) ? body.state : 'in_review';
  const priority = ['low','normal','high','critical'].includes(body.priority) ? body.priority : 'normal';
  const { data: member } = await supabase.from('case_members').select('role').eq('case_id', id).eq('user_id', user.id).maybeSingle();
  if (!member || !['investigator', 'examiner'].includes(member.role)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (member.role === 'examiner') {
    const { data: assignment } = await supabaseAdmin.from('evidence_assignments').select('id').eq('case_id', id).eq('evidence_id', evidenceId).eq('assigned_to', user.id).eq('status', 'assigned').maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Evidence is not assigned to this examiner.' }, { status: 403 });
  }
  const { data: evidence, error: evidenceError } = await supabase.from('evidence').select('sha256_original').eq('id', evidenceId).eq('case_id', id).single();
  if (evidenceError || !evidence) return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
  const { data, error } = await supabase.from('evidence_reviews').upsert({ case_id: id, evidence_id: evidenceId, reviewer_id: user.id, state, priority, summary: String(body.summary ?? ''), limitations: Array.isArray(body.limitations) ? body.limitations : [] }, { onConflict: 'evidence_id,reviewer_id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: custodyError } = await supabaseAdmin.rpc('record_custody_event', {
    p_case_id: id,
    p_evidence_id: evidenceId,
    p_actor_user_id: user.id,
    p_event_type: 'review',
    p_hash: evidence.sha256_original,
    p_details: { state, priority, summary: String(body.summary ?? '') },
  });
  if (custodyError) {
    console.error('custody review failed', custodyError.code, custodyError.message);
    return NextResponse.json({ error: 'Review saved, but the custody event could not be recorded.' }, { status: 500 });
  }
  return NextResponse.json({ review: data });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
