'use client';
import { useCallback, useState } from 'react';
import { ActionFeedback } from './ActionFeedback';

export function ReviewPanel({ caseId, evidenceId }: { caseId: string; evidenceId: string }) {
  const [summary, setSummary] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  async function review() {
    setBusy(true);
    try { const r = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/review`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ state:'reviewed', priority, summary, limitations:['Deterministic review is not an authenticity or legal-admissibility finding.'] }) }); const b = await r.json(); setMessage(r.ok ? 'Review saved.' : (b.error || 'Review failed.')); }
    catch { setMessage('Review request failed.'); } finally { setBusy(false); }
  }
  async function addNote() {
    setNoteBusy(true);
    try { const r = await fetch(`/api/cases/${caseId}/evidence/${evidenceId}/notes`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ note }) }); const b = await r.json(); setMessage(r.ok ? 'Examiner note saved.' : (b.error || 'Note failed.')); if (r.ok) setNote(''); }
    catch { setMessage('Note request failed.'); } finally { setNoteBusy(false); }
  }
  if (!evidenceId) return null;
  return <section className="mt-6 card p-5"><h2 className="text-lg font-semibold">Examiner review</h2><textarea className="input mt-3" rows={3} placeholder="Review summary and limitations" value={summary} onChange={e=>setSummary(e.target.value)} /><div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-sm font-medium" htmlFor="priority">Priority</label><select id="priority" className="input w-auto" value={priority} onChange={e=>setPriority(e.target.value)}><option>low</option><option>normal</option><option>high</option><option>critical</option></select><button className="btn-primary" disabled={busy} onClick={review}>{busy ? 'Saving…' : 'Mark reviewed'}</button></div><textarea className="input mt-3" rows={2} placeholder="Examiner note" value={note} onChange={e=>setNote(e.target.value)} /><button className="btn-secondary mt-2" disabled={noteBusy} onClick={addNote}>{noteBusy ? 'Working...' : 'Add note'}</button>{message && <ActionFeedback message={message} kind={message.endsWith('failed.') || message.endsWith('failed') ? 'error' : 'success'} onDismiss={() => setMessage('')} />}</section>;
}
