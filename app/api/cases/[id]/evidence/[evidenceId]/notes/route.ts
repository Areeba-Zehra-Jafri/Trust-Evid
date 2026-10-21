import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const { id, evidenceId } = await params;
  const { supabase } = await requireAal2User();
  const { data, error } = await supabase.from('examiner_notes').select('*').eq('case_id', id).eq('evidence_id', evidenceId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const { id, evidenceId } = await params;
  const { supabase, user } = await requireAal2User();
  const body = await req.json().catch(() => ({}));
  if (typeof body.note !== 'string' || body.note.trim().length < 3) return NextResponse.json({ error: 'A note is required.' }, { status: 400 });
  const { data, error } = await supabase.from('examiner_notes').insert({ case_id: id, evidence_id: evidenceId, examiner_id: user.id, note: body.note.trim() }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ note: data });
}
