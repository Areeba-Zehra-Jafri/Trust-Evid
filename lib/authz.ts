import { NextResponse } from 'next/server';
import { supabaseServer } from './supabase/server';

export async function requireAal2User(request: Request) {
  const { data: { session }, error } = await supabaseServer.auth.getSession({ req: request });
  if (error || !session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const aal = session.access_token ? parseAalFromJwt(session.access_token) : null;
  if (aal !== 'aal2') {
    return NextResponse.json({ error: 'Two-factor authentication required' }, { status: 403 });
  }
  return session.user;
}

function parseAalFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded.aal || null;
  } catch {
    return null;
  }
}
