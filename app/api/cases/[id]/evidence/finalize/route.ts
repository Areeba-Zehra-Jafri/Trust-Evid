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
      .select('id, storage_path')
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

    const { data: updated, error: updError } = await supabaseAdmin
      .from('evidence')
      .update({ sha256_original: serverHash, uploaded_at: new Date().toISOString() })
      .eq('id', evidenceId)
      .select()
      .single();
    if (updError) return NextResponse.json({ error: updError.message }, { status: 400 });

    // TODO: custody 'intake' event (needs record_custody_event fix, see below)

    return NextResponse.json({ evidence: updated, verified_hash: serverHash });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
