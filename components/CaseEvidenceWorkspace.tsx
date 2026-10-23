'use client';

import { useEffect, useState } from 'react';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { ReviewPanel } from './ReviewPanel';
import { ActionFeedback } from './ActionFeedback';

type Evidence = { id: string; original_filename?: string; processing_status?: 'awaiting_upload' | 'uploaded' | 'processing' | 'ready' | 'rejected' | 'failed'; sha256_original?: string; media_type?: string; file_size?: number; created_at?: string };

export function CaseEvidenceWorkspace({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Evidence could not be loaded');
      const next = body.evidence || body.data || [];
      setItems(next); if (selected && !next.some((item: Evidence) => item.id === selected)) setSelected(next[0]?.id ?? ''); else if (!selected && next[0]) setSelected(next[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Evidence could not be loaded'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [caseId]);
  const current = items.find(item => item.id === selected);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');
  async function retry() {
    if (!current) return;
    setRetrying(true); setRetryMessage('');
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence/${current.id}/retry`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Retry could not be started');
      setRetryMessage('Retry accepted; processing will update this item shortly.');
      await load();
    } catch (e) { setRetryMessage(e instanceof Error ? e.message : 'Retry could not be started'); }
    finally { setRetrying(false); }
  }
  function downloadItemReport() {
    if (current) window.open(`/api/cases/${caseId}/evidence/${current.id}/report`, '_blank', 'noopener,noreferrer');
  }
  useEffect(() => { if (!current) return; fetch(`/api/cases/${caseId}/evidence/${current.id}/custody`, { cache: 'no-store' }).then(r => r.json()).then(b => setTimeline(b.custody_events || [])).catch(() => setTimeline([])); }, [caseId, current?.id]);
  return <section className="mt-6 card min-w-0 overflow-hidden p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Evidence review</h2><p className="text-sm text-slate-500">Select an item to review its integrity, findings, custody, and examiner notes.</p></div><button className="btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!loading && !error && items.length === 0 && <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No evidence has been finalized yet. Upload authorized demonstration media to begin.</p>}
    {items.length > 0 && <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_2fr]"><div className="space-y-2">{items.map(item => <button key={item.id} onClick={() => setSelected(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selected === item.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}><span className="block truncate font-medium">{item.original_filename || item.id}</span><span className="text-xs text-slate-500">{item.processing_status || 'unknown'} · {item.media_type || 'media'} · {item.file_size ? `${item.file_size.toLocaleString()} bytes` : 'size unknown'}</span></button>)}</div><div className="min-w-0"><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold">SHA-256:</span> <code className="break-all">{current?.sha256_original || 'Not finalized'}</code></div>{current && <><div className="mt-2 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"><span className="text-xs text-slate-500">Custody is shown as a read-only timeline below.</span><div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap"><button className="btn-secondary w-full sm:w-auto" onClick={downloadItemReport}>Open evidence report</button><a className="btn-primary w-full text-center sm:w-auto" href={`/cases/${caseId}/evidence/${current.id}/print`}>Print / PDF view</a>{current.processing_status === 'failed' && <button className="btn-primary w-full sm:w-auto" onClick={retry} disabled={retrying}>{retrying ? 'Working...' : 'Retry processing'}</button>}</div>{retryMessage && <ActionFeedback message={retryMessage} kind={retryMessage.startsWith('Retry accepted') ? 'success' : 'error'} onDismiss={() => setRetryMessage('')} />}{timeline.length > 0 && <ol className="mt-3 space-y-2 text-xs">{timeline.map(event => <li key={event.id} className="rounded border border-slate-200 bg-white p-2"><strong>{event.event_type}</strong> · {new Date(event.event_time).toLocaleString()}<div className="text-slate-500">Actor: {event.actor_user_id}</div></li>)}</ol>}</div></>}</div><AIAnalysisPanel caseId={caseId} evidenceId={current?.id || ''} /><ReviewPanel caseId={caseId} evidenceId={current?.id || ''} /></div>}
  </section>;
}
