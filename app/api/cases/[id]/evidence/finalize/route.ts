import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';

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
  const { id: caseId } = await params;
  const { supabase, user } = await requireAal2User();
  if (!await requireCaseRole(caseId, user.id, ['investigator', 'uploader'])) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const evidenceId = body?.evidence_id;
  if (typeof evidenceId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evidenceId)) return NextResponse.json({ error: 'A valid evidence_id is required.' }, { status: 400 });
  const browserHash = body?.sha256 === undefined ? null : typeof body.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(body.sha256) ? body.sha256.toLowerCase() : undefined;
  if (browserHash === undefined) return NextResponse.json({ error: 'sha256 must be a valid SHA-256 value.' }, { status: 400 });
  const { data: evidence, error: lookupError } = await supabase.from('evidence').select('id,case_id,sha256_original').eq('id', evidenceId).eq('case_id', caseId).maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'Could not look up evidence.' }, { status: 500 });
  if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });
  const url = process.env.WORKER_URL?.replace(/\/$/, ''); const secret = process.env.WORKER_SHARED_SECRET;
  if (!url || !secret) return NextResponse.json({ error: 'Processing worker is not configured.' }, { status: 503 });
  let response: Response;
  try { response = await fetch(`${url}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': secret }, body: JSON.stringify({ evidence_id: evidenceId }), signal: AbortSignal.timeout(30_000) }); }
  catch { return NextResponse.json({ error: 'Original verification worker could not be reached.' }, { status: 502 }); }
  if (!response.ok) return NextResponse.json({ error: 'Original verification failed.' }, { status: response.status === 404 ? 404 : 502 });
  const verified = await response.json().catch(() => null);
  if (!verified || !/^[a-f0-9]{64}$/.test(verified.sha256) || !Number.isSafeInteger(verified.byte_count) || verified.byte_count <= 0) return NextResponse.json({ error: 'Worker returned an invalid verification result.' }, { status: 502 });
  if (browserHash && browserHash !== verified.sha256) return NextResponse.json({ error: 'The supplied hash does not match the stored bytes.' }, { status: 409 });
  const { data: result, error: finalizeError } = await supabase.rpc('finalize_verified_evidence', { p_case_id: caseId, p_evidence_id: evidenceId, p_sha256: verified.sha256, p_byte_count: verified.byte_count });
  if (finalizeError) {
    const message = finalizeError.message.toLowerCase();
    if (message.includes('not authorized')) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    if (message.includes('not found')) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });
    if (message.includes('conflicting')) return NextResponse.json({ error: 'Finalization conflicts with existing evidence custody.' }, { status: 409 });
    if (message.includes('invalid')) return NextResponse.json({ error: 'Worker verification data was invalid.' }, { status: 502 });
    return NextResponse.json({ error: 'Could not finalize evidence atomically.' }, { status: 500 });
  }
  if (!result || !['finalized', 'already_finalized'].includes(result.state)) return NextResponse.json({ error: 'Finalization returned an invalid result.' }, { status: 502 });
  return NextResponse.json({ verified_hash: result.sha256, byte_count: result.byte_count, state: result.state });
}
