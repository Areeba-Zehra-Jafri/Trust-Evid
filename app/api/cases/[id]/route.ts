import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { user } = await requireAal2User(req);
  const caseId = params.id;

  const role = await requireCaseRole(caseId, user.id, ['investigator', 'uploader', 'examiner']);
  if (!role) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  const supabase = createServerClient({ req, res: new Response(), env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }});

  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}
