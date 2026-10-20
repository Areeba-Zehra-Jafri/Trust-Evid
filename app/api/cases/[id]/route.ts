import { NextRequest, NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { supabaseServer } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAal2User(request);
  if (user instanceof NextResponse) return user;

  const role = await requireCaseRole(params.id, user.id, ['investigator', 'uploader', 'examiner']);
  if (!role) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  const { data: caseData, error } = await supabaseServer
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !caseData) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify(caseData), { status: 200, headers: { 'content-type': 'application/json' } });
}
