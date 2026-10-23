'use client';
import { useState } from 'react';
import { ActionFeedback } from './ActionFeedback';

export function ReportPanel({ caseId }: { caseId: string }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{message:string;kind:'success'|'error'}|null>(null);
  async function download() {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/report`);
      if (!response.ok) throw new Error((await response.json()).error ?? 'Report unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `trust-evid-${caseId}.json`; link.click();
      URL.revokeObjectURL(url); setFeedback({message:'Report downloaded.',kind:'success'});
    } catch (error) { setFeedback({message:error instanceof Error ? error.message : 'Report unavailable',kind:'error'}); }
    finally { setBusy(false); }
  }
  return <section className="card mt-6 p-5"><ActionFeedback message={feedback?.message || ''} kind={feedback?.kind || 'success'} onDismiss={() => setFeedback(null)} /><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Evidence review report</h2><p className="text-sm text-slate-500">Download a portable JSON record of findings, reviews, notes, custody events, and limitations, or open a printable PDF view of the whole case. Hashes support integrity checks, not authenticity.</p></div><div className="flex shrink-0 flex-col gap-2 sm:flex-row"><button className="btn-primary" disabled={busy} onClick={download}>{busy ? 'Working...' : 'Download report'}</button><a className="btn-secondary text-center" href={`/cases/${caseId}/print`}>Print / PDF view</a></div></div></section>;
}
