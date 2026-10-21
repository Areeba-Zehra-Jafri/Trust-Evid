import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAal2User(req);
  const { id: caseId } = await params;

  const role = await requireCaseRole(caseId, user.id, ['investigator']);
  if (!role) {
    // 404 if not member
    const memberCheck = await requireCaseRole(caseId, user.id, ['investigator', 'uploader', 'examiner']);
    if (!memberCheck) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const supabaseAdmin = createServerClient({ env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }});

  const { data: caseData, error: fetchError } = await supabaseAdmin
    .from('cases')
    .select('status')
    .eq('id', caseId)
    .single();

  if (fetchError || !caseData) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  if (caseData.status === 'archived') {
    return new Response(JSON.stringify({ error: 'Conflict: already archived' }), { status: 409 });
  }

  if (!['open', 'closed'].includes(caseData.status)) {
    return new Response(JSON.stringify({ error: 'Invalid case status for archiving' }), { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('cases')
    .update({ status: 'archived' })
    .eq('id', caseId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(null, { status: 200 });
}
