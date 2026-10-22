import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';
import { LIMITS } from '@/lib/limits';
import { supabaseAdmin } from '@/lib/supabase/admin';

const allowed = new Set(['image/jpeg', 'image/png', 'video/mp4']);
const maxBytes = LIMITS.max_file_size;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireAal2User();
    const body = await req.json().catch(() => null);
    const name = typeof body?.original_filename === 'string' ? body.original_filename.trim() : '';
    const type = typeof body?.media_type === 'string' ? body.media_type : '';
    const size = Number(body?.file_size);
    if (!name || !allowed.has(type) || !Number.isSafeInteger(size) || size <= 0 || size > maxBytes) return NextResponse.json({ error: 'Unsupported file type or size.' }, { status: 400 });
    const { data: member } = await supabase.from('case_members').select('role').eq('case_id', id).eq('user_id', user.id).maybeSingle();
    if (!member || !['investigator', 'uploader'].includes(member.role)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    const evidenceId = crypto.randomUUID();
    const storagePath = `${id}/${evidenceId}/${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { data: record, error } = await supabase.from('evidence').insert({ id: evidenceId, case_id: id, storage_path: storagePath, original_filename: name, media_type: type, file_size: size, owner_user_id: user.id, source_details: body?.source_details ?? {} }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data: signed, error: signError } = await supabase.storage.from('evidence-originals').createSignedUploadUrl(storagePath);
    if (signError) { await supabaseAdmin.from('evidence').update({ processing_status: 'failed' }).eq('id', evidenceId); return NextResponse.json({ error: signError.message }, { status: 400 }); }
    return NextResponse.json({ evidence: record, token: signed.token, path: signed.path });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAal2User();
    const { data, error } = await supabase.from('evidence').select('*').eq('case_id', id).order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ evidence: data ?? [] });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
