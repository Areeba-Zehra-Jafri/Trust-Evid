import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requireAal2User } from '@/lib/authz';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireAal2User();
    const body = await req.json().catch(() => null);
    const evidenceId = body?.evidence_id;
    const hash = typeof body?.sha256 === 'string' ? body.sha256.toLowerCase() : '';
    if (!evidenceId || !/^[a-f0-9]{64}$/.test(hash)) return NextResponse.json({ error: 'A SHA-256 hash is required.' }, { status: 400 });
    const { data: evidence } = await supabase.from('evidence').select('*').eq('id', evidenceId).eq('case_id', id).eq('owner_user_id', user.id).single();
    if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });
    const { data: updated, error } = await supabase.from('evidence').update({ sha256_original: hash, processing_status: 'uploaded', uploaded_at: new Date().toISOString() }).eq('id', evidenceId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { error: custodyError } = await supabase.from('custody_events').insert({ case_id: id, evidence_id: evidenceId, actor_user_id: user.id, event_type: 'intake', evidence_hash: hash, details: { method: 'client_sha256', note: 'Hash recorded at upload finalization.' } });
    if (custodyError) return NextResponse.json({ error: custodyError.message }, { status: 400 });
    return NextResponse.json({ evidence: updated, verified_hash: createHash('sha256').update(hash).digest('hex') });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
