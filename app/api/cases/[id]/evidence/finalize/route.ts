import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requireAal2User } from '@/lib/authz';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireAal2User();

    // 1. Membership/role check with the user's session (select-only RLS).
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

    // 2. Input. ASSUMED body keys: evidence_id, sha256
    const body = await req.json().catch(() => null);
    const evidenceId = typeof body?.evidence_id === 'string' ? body.evidence_id : '';
    const clientHash = typeof body?.sha256 === 'string' ? body.sha256.toLowerCase() : '';
    if (!evidenceId || !/^[a-f0-9]{64}$/.test(clientHash)) {
      return NextResponse.json({ error: 'Invalid evidence id or hash.' }, { status: 400 });
    }

    // 3. Evidence must belong to this case.
    const { data: evidence } = await supabase
      .from('evidence')
      .select('id, storage_path')
      .eq('id', evidenceId)
      .eq('case_id', id)
      .maybeSingle();
    if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });

    // 4. Server-side hash of the stored original, compared to the client's hash.
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

    // 5. Update the evidence row. ASSUMED columns: sha256, processing_status
    const { data: updated, error: updError } = await supabaseAdmin
      .from('evidence')
      .update({ sha256: serverHash, processing_status: 'uploaded' })
      .eq('id', evidenceId)
      .select()
      .single();
    if (updError) return NextResponse.json({ error: updError.message }, { status: 400 });

    // 6. Custody write through the function, service role only.
    // ASSUMED parameter names, check against pg_get_functiondef.
    const { error: custodyError } = await supabaseAdmin.rpc('record_custody_event', {
      p_case_id: id,
      p_evidence_id: evidenceId,
      p_actor_user_id: user.id,
      p_event_type: 'intake',
      p_evidence_hash: serverHash,
      p_details: { method: 'server_sha256', note: 'Hash verified server-side at upload finalization.' },
    });
    if (custodyError) return NextResponse.json({ error: custodyError.message }, { status: 400 });

    return NextResponse.json({ evidence: updated, verified_hash: serverHash });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
