'use client';
import { useState } from 'react';
export function AIAnalysisPanel({ caseId, evidenceId }: { caseId:string; evidenceId:string }) {
 const [state,setState]=useState<any>(null); const [busy,setBusy]=useState(false);
 async function run(){setBusy(true); const r=await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/ai`,{method:'POST'}); setState(await r.json()); setBusy(false)}
 return <section className="mt-6 card p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">AI-assisted triage</h2><p className="text-xs text-slate-500">Grounded in deterministic findings; not an authenticity or legal conclusion.</p></div><button className="btn-secondary" disabled={busy} onClick={run}>{busy?'Analyzing…':'Run analysis'}</button></div>{state?.error&&<p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">{state.error}</p>}{state?.parsed_result&&<div className="mt-4 space-y-2 text-sm"><p>{state.parsed_result.summary}</p><p><b>Uncertainty:</b> {state.parsed_result.uncertainty}</p><p><b>Triage priority:</b> {state.parsed_result.review_priority}</p></div>}</section>
}
