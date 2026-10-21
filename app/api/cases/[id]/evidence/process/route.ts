import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireAal2User();
  const body = await req.json().catch(() => null);
  const evidenceId = body?.evidence_id;
  const { data: evidence } = await supabase.from('evidence').select('*').eq('id', evidenceId).eq('case_id', id).single();
  if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });
  if (!process.env.WORKER_URL || !process.env.WORKER_SHARED_SECRET) return NextResponse.json({ error: 'Processing worker is not configured.' }, { status: 503 });
  const { data: signed, error } = await supabase.storage.from('evidence').createSignedUrl(evidence.storage_path, 300);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'Could not create a processing download URL.' }, { status: 400 });
  await supabase.from('evidence').update({ processing_status: 'processing', processing_started_at: new Date().toISOString() }).eq('id', evidenceId);
  const response = await fetch(`${process.env.WORKER_URL.replace(/\/$/, '')}/process`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': process.env.WORKER_SHARED_SECRET }, body: JSON.stringify({ evidence_id: evidenceId, case_id: id, media_type: evidence.media_type, signed_url: signed.signedUrl, supabase_url: process.env.SUPABASE_URL, access_token: (await supabase.auth.getSession()).data.session?.access_token }) });
  if (!response.ok) return NextResponse.json({ error: 'Worker rejected processing.' }, { status: 502 });
  return NextResponse.json({ accepted: true, requested_by: user.id });
}
