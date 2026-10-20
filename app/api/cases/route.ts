import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';
import { createServerClient } from '@supabase/ssr';
import { validateNewCase } from '@/lib/validate-case';

export async function GET(req: Request) {
  await requireAal2User(req);

  const supabase = createServerClient({ req, res: new Response(), env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }});

  const { data: cases, error } = await supabase
    .from('cases')
    .select(
      `*,
      (select count(*) from evidence where case_id = cases.id) as evidence_count
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(cases), { status: 200 });
}

export async function POST(req: Request) {
  const { user } = await requireAal2User(req);
  const body = await req.json();

  const validation = validateNewCase(body);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
  }

  const supabaseAdmin = createServerClient({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  });

  const { data, error } = await supabaseAdmin.rpc('create_case_with_owner', {
    p_user: user.id,
    p_title: body.title,
    p_ref: body.reference_number,
    p_desc: body.description,
  });

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'reference_number must be unique' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 201 });
}
