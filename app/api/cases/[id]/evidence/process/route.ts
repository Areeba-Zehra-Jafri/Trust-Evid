import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';

const PROCESSING_ROLES = ['investigator', 'uploader'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params;
  const { supabase, user } = await requireAal2User();

  const body = await req.json().catch(() => null);
  const evidenceId = body?.evidence_id;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'evidence_id') || typeof evidenceId !== 'string' || !UUID.test(evidenceId)) {
    return NextResponse.json({ error: 'A valid evidence_id is required.' }, { status: 400 });
  }

  const role = await requireCaseRole(caseId, user.id, PROCESSING_ROLES);
  if (!role) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { data: evidence, error: lookupError } = await supabase
    .from('evidence')
    .select('id, case_id')
    .eq('id', evidenceId)
    .eq('case_id', caseId)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: 'Could not look up evidence.' }, { status: 500 });
  }
  if (!evidence) return NextResponse.json({ error: 'Evidence not found.' }, { status: 404 });

  const workerUrl = process.env.WORKER_URL?.replace(/\/$/, '');
  const workerSecret = process.env.WORKER_SHARED_SECRET;
  if (!workerUrl || !workerSecret) {
    return NextResponse.json({ error: 'Processing worker is not configured.' }, { status: 503 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(`${workerUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': workerSecret },
        body: JSON.stringify({ evidence_id: evidenceId }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const status = response.status === 404 ? 404 : response.status === 429 ? 503 : 502;
      return NextResponse.json({ error: 'Processing worker rejected the request.', worker_status: response.status }, { status });
    }
    return NextResponse.json({ accepted: true, requested_by: user.id });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Processing worker timed out.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Processing worker could not be reached.' }, { status: 502 });
  }
}
