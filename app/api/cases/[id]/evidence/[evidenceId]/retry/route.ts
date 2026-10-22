import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';

export async function POST(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    const { id, evidenceId } = await params;
    const { supabase, user } = await requireAal2User();
    const role = await requireCaseRole(id, user.id, ['investigator', 'uploader']);
    if (!role) return NextResponse.json({ error: 'Only investigators or uploaders may retry processing.' }, { status: 403 });

    const { data: evidence, error: lookupError } = await supabase.from('evidence')
      .select('id,processing_status,storage_path').eq('id', evidenceId).eq('case_id', id).maybeSingle();
    if (lookupError) return NextResponse.json({ error: 'Could not load evidence.' }, { status: 500 });
    if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });
    if (evidence.processing_status !== 'failed') return NextResponse.json({ error: 'Only failed evidence can be retried.' }, { status: 409 });
    if (!evidence.storage_path) return NextResponse.json({ error: 'Evidence has no stored original.' }, { status: 409 });

    const workerUrl = process.env.WORKER_URL?.replace(/\/$/, '');
    const secret = process.env.WORKER_SHARED_SECRET;
    if (!workerUrl || !secret) return NextResponse.json({ error: 'Processing worker is not configured.' }, { status: 503 });
    const { error: resetError } = await supabase.from('evidence').update({ processing_status: 'uploaded', error: null })
      .eq('id', evidenceId).eq('case_id', id).eq('processing_status', 'failed');
    if (resetError) return NextResponse.json({ error: 'Could not reset evidence for retry.' }, { status: 500 });

    try {
      const response = await fetch(`${workerUrl}/process`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': secret },
        body: JSON.stringify({ evidence_id: evidenceId }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`worker status ${response.status}`);
      return NextResponse.json({ accepted: true, processing_status: 'uploaded' });
    } catch {
      await supabase.from('evidence').update({ processing_status: 'failed', error: { message: 'Retry worker dispatch failed.' } })
        .eq('id', evidenceId).eq('case_id', id);
      return NextResponse.json({ error: 'Retry worker could not be reached; evidence was marked failed.' }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Retry failed.' }, { status: 500 });
  }
}
