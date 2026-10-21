'use client';
import { useState } from 'react';

export function ReportPanel({ caseId }: { caseId: string }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/report`);
      if (!response.ok) throw new Error((await response.json()).error ?? 'Report unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `trust-evid-${caseId}.json`; link.click();
      URL.revokeObjectURL(url);
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Report unavailable'); }
    finally { setBusy(false); }
  }
  return <section className="card mt-6 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Evidence review report</h2><p className="text-sm text-slate-500">Download a portable JSON record of findings, reviews, notes, custody events, and limitations.</p></div><button className="btn-primary shrink-0" disabled={busy} onClick={download}>{busy ? 'Preparing…' : 'Download report'}</button></div></section>;
}
