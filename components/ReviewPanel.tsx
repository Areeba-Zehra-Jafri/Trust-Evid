'use client';
import { useState } from 'react';

export function ReviewPanel({ caseId, evidenceId }: { caseId: string; evidenceId: string }) {
  const [summary, setSummary] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [chain, setChain] = useState<any>(null);
  async function review() {
    const r = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/review`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ state:'reviewed', priority:'normal', summary, limitations:['Deterministic review is not an authenticity or legal-admissibility finding.'] }) });
    setMessage(r.ok ? 'Review saved.' : (await r.json()).error);
  }
  async function addNote() {
    const r = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/notes`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ note }) });
    setMessage(r.ok ? 'Examiner note saved.' : (await r.json()).error); if (r.ok) setNote('');
  }
  async function verify() { const r = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/chain`); setChain(await r.json()); }
  return <section className="mt-6 card p-5"><h2 className="text-lg font-semibold">Examiner review</h2><textarea className="input mt-3" rows={3} placeholder="Review summary and limitations" value={summary} onChange={e=>setSummary(e.target.value)} /><div className="mt-3 flex gap-2"><button className="btn-primary" onClick={review}>Mark reviewed</button><button className="btn-secondary" onClick={verify}>Verify custody chain</button></div><textarea className="input mt-3" rows={2} placeholder="Examiner note" value={note} onChange={e=>setNote(e.target.value)} /><button className="btn-secondary mt-2" onClick={addNote}>Add note</button>{message && <p className="mt-3 text-sm">{message}</p>}{chain && <pre className="mt-3 overflow-auto rounded bg-slate-100 p-3 text-xs">{JSON.stringify(chain,null,2)}</pre>}</section>;
}
