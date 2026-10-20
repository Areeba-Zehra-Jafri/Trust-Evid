import { NextRequest, NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { validateNewCase } from '@/lib/validate-case';

export async function GET(request: NextRequest) {
  const user = await requireAal2User(request);
  if (user instanceof NextResponse) return user;

  const { data: cases, error } = await supabaseServer
    .from('cases')
    .select(
      `*, evidence_count:cases_evidences(count)`
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }

  return NextResponse.json({ cases });
}

export async function POST(request: NextRequest) {
  const user = await requireAal2User(request);
  if (user instanceof NextResponse) return user;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const errors = validateNewCase(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { title, referenceNumber, description } = body;

  const { data, error } = await supabaseAdmin.rpc('create_case_with_owner', {
    p_user: user.id,
    p_title: title,
    p_ref: referenceNumber,
    p_desc: description ?? '',
  });

  if (error) {
    if (error.code === '23505' && error.constraint === 'cases_reference_number_key') {
      return NextResponse.json({ error: 'Reference number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }

  return NextResponse.json({ case: data }, { status: 201 });
}
