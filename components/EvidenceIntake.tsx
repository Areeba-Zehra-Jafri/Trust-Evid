'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export function EvidenceIntake({ caseId }: { caseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!file) return;
    setBusy(true); setMessage('');
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const init = await fetch(`/api/cases/${caseId}/evidence`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ original_filename: file.name, media_type: file.type, file_size: file.size }) });
      const start = await init.json();
      if (!init.ok) throw new Error(start.error);
      const upload = await supabaseBrowser.storage.from('evidence-originals').uploadToSignedUrl(start.path, start.token, file);
      if (upload.error) throw new Error(upload.error.message);
      const done = await fetch(`/api/cases/${caseId}/evidence/finalize`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evidence_id: start.evidence.id, sha256: hash }) });
      const result = await done.json();
      if (!done.ok) throw new Error(result.error);
      setMessage(`Uploaded. SHA-256: ${hash}`); setFile(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Evidence intake</h2><p className="mb-4 text-sm text-slate-600">Synthetic or authorized image/video files only. Originals remain private.</p><input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><button disabled={!file || busy} onClick={submit} className="ml-3 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Uploading…' : 'Upload evidence'}</button>{message && <p className="mt-3 break-all text-sm">{message}</p>}</section>;
}
