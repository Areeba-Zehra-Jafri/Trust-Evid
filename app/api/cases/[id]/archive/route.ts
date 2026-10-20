import { NextRequest, NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAal2User(request);
  if (user instanceof NextResponse) return user;

  const role = await requireCaseRole(params.id, user.id, ['investigator']);
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: caseData, error: fetchError } = await supabaseAdmin
    .from('cases')
    .select('status')
    .eq('id', params.id)
    .single();

  if (fetchError || !caseData) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (caseData.status === 'archived') {
    return NextResponse.json({ error: 'Case already archived' }, { status: 409 });
  }

  if (!['open', 'closed'].includes(caseData.status)) {
    return NextResponse.json({ error: 'Cannot archive case in current status' }, { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('cases')
    .update({ status: 'archived' })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to archive case' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
