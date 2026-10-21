import { NextResponse } from 'next/server';
import { requireAal2User } from '@/lib/authz';

/** Generates a portable review report from rows visible to the authenticated member. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAal2User();
  const [{ data: caseData, error: caseError }, evidence, findings, reviews, notes, custody] = await Promise.all([
    supabase.from('cases').select('id,title,reference_number,description,status,created_at,updated_at').eq('id', id).single(),
    supabase.from('evidence').select('*').eq('case_id', id).order('created_at'),
    supabase.from('processing_findings').select('*').eq('case_id', id).order('created_at'),
    supabase.from('evidence_reviews').select('*').eq('case_id', id).order('updated_at'),
    supabase.from('examiner_notes').select('*').eq('case_id', id).order('created_at'),
    supabase.from('custody_events').select('*').eq('case_id', id).order('event_time'),
  ]);
  if (caseError || !caseData) return NextResponse.json({ error: caseError?.message ?? 'Case not found' }, { status: 404 });
  const report = {
    report_version: '1.0', generated_at: new Date().toISOString(), case: caseData,
    evidence: evidence.data ?? [], findings: findings.data ?? [], reviews: reviews.data ?? [],
    examiner_notes: notes.data ?? [], custody_events: custody.data ?? [],
    limitations: ['Demonstration report only.', 'Hashes document integrity checks, not authenticity.', 'No conclusion about guilt, identity, provenance, or legal admissibility.', 'Results depend on available metadata, bounded processing, and reviewer notes.'],
  };
  return new NextResponse(JSON.stringify(report, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="trust-evid-${id}.json"` } });
}
