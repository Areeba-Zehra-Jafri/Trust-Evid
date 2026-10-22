import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    const { id, evidenceId } = await params;
    const { supabase, user } = await requireAal2User();
    const role = await requireCaseRole(id, user.id, ['investigator', 'uploader', 'examiner']);
    if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (role === 'examiner') {
      const { data: assignment } = await supabase.from('evidence_assignments').select('id').eq('case_id', id).eq('evidence_id', evidenceId).eq('assigned_to', user.id).eq('status', 'assigned').maybeSingle();
      if (!assignment) return NextResponse.json({ error: 'Evidence is not assigned to this examiner' }, { status: 403 });
    }
    const { data, error } = await supabase.from('custody_events').select('*').eq('case_id', id).eq('evidence_id', evidenceId).order('event_time', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ custody_events: data ?? [] });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
