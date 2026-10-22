import { NextResponse } from 'next/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    const { id, evidenceId } = await params;
    const { supabase, user } = await requireAal2User();
    const role = await requireCaseRole(id, user.id, ['investigator', 'uploader', 'examiner']);
    if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (role === 'examiner') {
      const { data: assignment } = await supabase.from('evidence_assignments').select('id').eq('case_id', id).eq('evidence_id', evidenceId).eq('assigned_to', user.id).eq('status', 'assigned').maybeSingle();
      if (!assignment) return NextResponse.json({ error: 'Evidence is not assigned to this examiner' }, { status: 403 });
    }
    const [evidence, findings, ai, reviews, notes, custody] = await Promise.all([
      supabase.from('evidence').select('id,case_id,original_filename,media_type,file_size,sha256_original,source_details,extracted_metadata,processing_status,error,uploaded_at,created_at,updated_at').eq('id', evidenceId).eq('case_id', id).maybeSingle(),
      supabase.from('processing_findings').select('*').eq('evidence_id', evidenceId).eq('case_id', id).order('created_at', { ascending: true }),
      supabase.from('ai_analyses').select('id,status,ai_model,prompt_version,parsed_result,error_message,created_at,updated_at').eq('evidence_id', evidenceId).eq('case_id', id).order('created_at', { ascending: false }).limit(1),
      supabase.from('evidence_reviews').select('*').eq('evidence_id', evidenceId).eq('case_id', id).order('updated_at', { ascending: false }),
      supabase.from('examiner_notes').select('*').eq('evidence_id', evidenceId).eq('case_id', id).order('created_at', { ascending: true }),
      supabase.from('custody_events').select('*').eq('evidence_id', evidenceId).eq('case_id', id).order('event_time', { ascending: true }),
    ]);
    if (evidence.error || !evidence.data) return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    if (findings.error || ai.error || reviews.error || notes.error || custody.error) return NextResponse.json({ error: 'Could not assemble evidence report' }, { status: 500 });
    const analysis = ai.data?.[0] ?? null;
    return NextResponse.json({
      report_version: '1.0',
      generated_at: new Date().toISOString(),
      evidence: evidence.data,
      integrity: {
        sha256_original: evidence.data.sha256_original,
        hash_match_disclaimer: 'Hash match shows bytes match the registered intake version; it does not prove authenticity.',
      },
      extracted_metadata: evidence.data.extracted_metadata ?? {},
      deterministic_findings: findings.data ?? [],
      ai_interpretation: analysis
        ? { label: analysis.status === 'complete' ? 'AI interpretation' : 'AI interpretation incomplete', ...analysis }
        : { label: 'AI interpretation incomplete', status: 'not_run', parsed_result: null },
      review_notes: { reviews: reviews.data ?? [], examiner_notes: notes.data ?? [] },
      custody_history: custody.data ?? [],
      limitations: [
        'Deterministic checks and AI interpretation are advisory and require human review.',
        'Missing or altered metadata can limit conclusions.',
        'This report does not establish identity, provenance, legal admissibility, or an authenticity conclusion.',
        'Hash match shows bytes match the registered intake version; it does not prove authenticity.',
      ],
    });
  } catch (e) { if (e instanceof Response) return e; throw e; }
}
