import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    const { id, evidenceId } = await params;
    const { supabase } = await requireAal2User();
    const { data, error } = await supabase.from('examiner_notes').select('*').eq('case_id', id).eq('evidence_id', evidenceId).order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ notes: data });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    const { id, evidenceId } = await params;
    const { user } = await requireAal2User();
    const role = await requireCaseRole(id, user.id, ['investigator', 'examiner']);
    if (!role) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    if (role === 'examiner') {
      const { data: assignment } = await supabaseAdmin.from('evidence_assignments').select('id').eq('case_id', id).eq('evidence_id', evidenceId).eq('assigned_to', user.id).eq('status', 'assigned').maybeSingle();
      if (!assignment) return NextResponse.json({ error: 'Evidence is not assigned to this examiner.' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    if (typeof body.note !== 'string' || body.note.trim().length < 3) return NextResponse.json({ error: 'A note is required.' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('examiner_notes').insert({ case_id: id, evidence_id: evidenceId, examiner_id: user.id, note: body.note.trim() }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ note: data });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
