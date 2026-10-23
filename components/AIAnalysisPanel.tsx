'use client';

import { useState } from 'react';
import { ActionFeedback } from './ActionFeedback';

type AnalysisState = { error?: string; error_message?: string; status?: string; parsed_result?: { summary?: string; uncertainty?: string; review_priority?: string } };

export function AIAnalysisPanel({ caseId, evidenceId }: { caseId: string; evidenceId: string }) {
  const [state, setState] = useState<AnalysisState | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  async function run() {
    setBusy(true);
    setFeedback(null);
    setState(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/ai`, { method: 'POST' });
      const body = await response.json();
      setState(body);
      setFeedback({
        message: response.ok ? 'AI analysis completed.' : (body.error || 'AI analysis failed.'),
        kind: response.ok ? 'success' : 'error',
      });
    } catch {
      setFeedback({ message: 'AI analysis request failed.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const incompleteReason = state?.error || (state?.status === 'incomplete' ? state.error_message : undefined);
  return <section className="mt-6 card p-5">
    <ActionFeedback message={feedback?.message || ''} kind={feedback?.kind || 'success'} onDismiss={() => setFeedback(null)} />
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">AI-assisted triage</h2><p className="text-xs text-slate-500">Advisory only; grounded in deterministic findings.</p></div>
      <button className="btn-secondary shrink-0" disabled={busy} onClick={run}>{busy ? 'Working...' : 'Run analysis'}</button>
    </div>
    {incompleteReason && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">AI analysis incomplete: {incompleteReason}</p><p className="mt-1">Deterministic findings remain available for review.</p></div>}
    {state?.parsed_result && <div className="mt-4 space-y-2 text-sm"><p>{state.parsed_result.summary}</p><p><b>Uncertainty:</b> {state.parsed_result.uncertainty}</p><p><b>Triage priority:</b> {state.parsed_result.review_priority}</p></div>}
  </section>;
}
