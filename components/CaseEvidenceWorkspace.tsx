'use client';

import { useEffect, useState } from 'react';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { ReviewPanel } from './ReviewPanel';

type Evidence = { id: string; original_filename?: string; processing_status?: 'awaiting_upload' | 'uploaded' | 'processing' | 'ready' | 'rejected' | 'failed'; sha256_original?: string; media_type?: string; file_size?: number; created_at?: string };
type ChainResult = { valid?: boolean; ok?: boolean; verified?: boolean; error?: string; message?: string };

export function CaseEvidenceWorkspace({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chain, setChain] = useState<ChainResult | null>(null);
  const [checking, setChecking] = useState(false);

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
  async function verifyChain() {
    if (!current) return;
    setChecking(true); setChain(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence/${current.id}/chain`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Verification failed');
      setChain(body);
    } catch (e) { setChain({ error: e instanceof Error ? e.message : 'Verification failed' }); }
    finally { setChecking(false); }
  }

  return <section className="mt-6 card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Evidence review</h2><p className="text-sm text-slate-500">Select an item to review its integrity, findings, custody, and examiner notes.</p></div><button className="btn-secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!loading && !error && items.length === 0 && <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No evidence has been finalized yet. Upload authorized demonstration media to begin.</p>}
    {items.length > 0 && <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_2fr]"><div className="space-y-2">{items.map(item => <button key={item.id} onClick={() => setSelected(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selected === item.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}><span className="block truncate font-medium">{item.original_filename || item.id}</span><span className="text-xs text-slate-500">{item.processing_status || 'unknown'} · {item.media_type || 'media'} · {item.file_size ? `${item.file_size.toLocaleString()} bytes` : 'size unknown'}</span></button>)}</div><div className="min-w-0"><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold">SHA-256:</span> <code className="break-all">{current?.sha256_original || 'Not finalized'}</code></div>{current && <><div className="mt-2 flex flex-wrap items-center gap-3"><button className="btn-secondary text-xs" onClick={verifyChain} disabled={checking}>{checking ? 'Verifying…' : 'Verify custody chain'}</button>{chain && <span role="status" className={`text-xs font-semibold ${chain.error ? 'text-red-700' : (chain.valid ?? chain.ok ?? chain.verified) ? 'text-emerald-700' : 'text-amber-700'}`}>{chain.error || ((chain.valid ?? chain.ok ?? chain.verified) ? 'Chain verified' : 'Chain requires review')}</span>}</div></>}</div><AIAnalysisPanel caseId={caseId} evidenceId={current?.id || ''} /><ReviewPanel caseId={caseId} evidenceId={current?.id || ''} /></div>}
  </section>;
}
