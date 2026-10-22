import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  return NextResponse.json({ error: 'Custody chain verification has been retired; use the custody timeline.' }, { status: 410 });
}
