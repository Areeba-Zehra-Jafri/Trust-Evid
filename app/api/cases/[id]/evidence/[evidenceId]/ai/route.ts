import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
  const { id, evidenceId } = await params;
  const { supabase, user } = await requireAal2User();
  const { data: evidence } = await supabase.from('evidence').select('id,case_id,media_type,processing_status').eq('id', evidenceId).eq('case_id', id).single();
  if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });
  if (evidence.processing_status !== 'ready') return NextResponse.json({ error: 'Deterministic processing must complete before AI analysis.' }, { status: 409 });
  const { data: findings } = await supabase.from('processing_findings').select('*').eq('evidence_id', evidenceId).eq('case_id', id).order('created_at', { ascending: false }).limit(1);
  const { data: prior } = await supabase.from('ai_analyses').insert({ case_id: id, evidence_id: evidenceId, user_id: user.id, status: 'queued', prompt_version: 'ai-grounded-v1' }).select().single();
  if (!prior) return NextResponse.json({ error: 'Could not create analysis record.' }, { status: 500 });
  if (!process.env.WORKER_URL || !process.env.WORKER_SHARED_SECRET) return NextResponse.json({ error: 'AI worker is not configured.', analysis_id: prior.id }, { status: 503 });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${process.env.WORKER_URL.replace(/\/$/, '')}/triage`, { signal: controller.signal, method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': process.env.WORKER_SHARED_SECRET }, body: JSON.stringify({ evidence_id: evidenceId }) });
    clearTimeout(timeout);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'AI worker rejected analysis');
    return NextResponse.json({ ...result, analysis_id: prior.id });
  } catch (error) {
    await supabase.from('ai_analyses').update({ status: 'incomplete', error_message: error instanceof Error ? error.message : 'AI analysis failed' }).eq('id', prior.id);
    return NextResponse.json({ error: 'AI analysis incomplete; deterministic findings were preserved.', analysis_id: prior.id }, { status: 502 });
  }
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
