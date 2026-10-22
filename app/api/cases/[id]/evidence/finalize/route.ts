import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requireAal2User } from '@/lib/authz';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireAal2User();

    const { data: member } = await supabase
      .from('case_members')
      .select('role')
      .eq('case_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (!['investigator', 'uploader'].includes(member.role)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const evidenceId = typeof body?.evidence_id === 'string' ? body.evidence_id : '';
    const rawHash = body?.sha256 ?? body?.hash;
    const clientHash = typeof rawHash === 'string' ? rawHash.toLowerCase() : '';
    if (!evidenceId || !/^[a-f0-9]{64}$/.test(clientHash)) {
      return NextResponse.json({ error: 'Invalid evidence id or hash.' }, { status: 400 });
    }

    const { data: evidence } = await supabase
      .from('evidence')
      .select('id, storage_path, processing_status')
      .eq('id', evidenceId)
      .eq('case_id', id)
      .maybeSingle();
    if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });

    const { data: file, error: dlError } = await supabaseAdmin.storage
      .from('evidence-originals')
      .download(evidence.storage_path);
    if (dlError || !file) {
      return NextResponse.json({ error: 'Uploaded file not found in storage.' }, { status: 400 });
    }
    const serverHash = createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');
    if (serverHash !== clientHash) {
      return NextResponse.json({ error: 'Hash mismatch between upload and stored file.' }, { status: 409 });
    }

    // Only move awaiting_upload -> uploaded. A retry must never regress processing/ready rows.
    const patch: Record<string, unknown> = {
      sha256_original: serverHash,
      uploaded_at: new Date().toISOString(),
    };
    if (evidence.processing_status === 'awaiting_upload') patch.processing_status = 'uploaded';

    const { data: updated, error: updError } = await supabaseAdmin
      .from('evidence')
      .update(patch)
      .eq('id', evidenceId)
      .eq('case_id', id)
      .select()
      .single();
    if (updError) return NextResponse.json({ error: updError.message }, { status: 400 });

    // Custody intake event. Service role only; actor comes from the verified session, never the body.
    const { error: custodyError } = await supabaseAdmin.rpc('record_custody_event', {
      p_case_id: id,
      p_evidence_id: evidenceId,
      p_actor_user_id: user.id,
      p_event_type: 'intake',
      p_hash: serverHash,
      p_details: { method: 'server_sha256', note: 'Hash verified server-side at upload finalization.' },
    });
    // 23505 = intake already recorded (finalize retry): treat as success.
    if (custodyError && custodyError.code !== '23505') {
      console.error('custody intake failed', custodyError.code, custodyError.message);
      return NextResponse.json(
        { error: 'Custody event could not be recorded. Processing was not started.', evidence: updated },
        { status: 500 }
      );
    }

    // Worker hand-off. Existing contract only: { evidence_id } + X-Worker-Secret. No user token.
    const workerUrl = process.env.WORKER_URL?.replace(/\/$/, '');
    const workerSecret = process.env.WORKER_SHARED_SECRET;
    if (!workerUrl || !workerSecret) {
      return NextResponse.json(
        { error: 'Processing worker is not configured.', evidence: updated },
        { status: 503 }
      );
    }

    const healthDeadline = Date.now() + 45_000;
    while (Date.now() < healthDeadline) {
      try { const health = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(8_000) }); if (health.ok) break; } catch { /* Render may still be waking */ }
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      let response = await fetch(`${workerUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': workerSecret },
        body: JSON.stringify({ evidence_id: evidenceId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        response = await fetch(`${workerUrl}/process`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': workerSecret }, body: JSON.stringify({ evidence_id: evidenceId }), signal: controller.signal });
      }
      if (!response.ok) {
        await supabaseAdmin.from('evidence').update({ processing_status: 'failed', error: { code: 'worker_unavailable', message: 'The processing worker did not accept the request after retry.' } }).eq('id', evidenceId).eq('processing_status', 'uploaded');
        return NextResponse.json({ error: 'Evidence was registered, but processing failed after a retry. Please use retry processing.', evidence: updated }, { status: 502 });
      }
    } catch {
      return NextResponse.json(
        { error: 'Evidence finalized, but processing could not be reached.', evidence: updated },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    return NextResponse.json({ evidence: updated, verified_hash: serverHash, processing_requested: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
