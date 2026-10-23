'use client';

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Signal = { check?: string; result?: string; details?: unknown };
type Finding = { signals?: Signal[] };
type Report = {
  evidence?: Record<string, unknown>;
  hash?: { sha256_original?: string };
  deterministic_findings?: Finding[];
  ai_interpretation?: { status?: string; parsed_result?: Record<string, unknown> | null; error_message?: string; ai_model?: string };
  review_notes?: { reviews?: unknown; examiner_notes?: unknown };
  custody_history?: { event_type?: string; event_time?: string; actor_user_id?: string }[];
  limitations?: string[];
  generated_at?: string;
};
type Item = { id: string; report?: Report; error?: string };

const text = (value: unknown, fallback = "—") => value == null || value === "" ? fallback : typeof value === "object" ? JSON.stringify(value) : String(value);
const compact = (value: unknown) => typeof value === "string" ? value : value == null ? "—" : JSON.stringify(value);
const asList = (value: unknown): unknown[] => Array.isArray(value) ? value : value ? [value] : [];
const DISCLAIMER = "Hash match shows bytes match the registered intake version; it does not prove authenticity.";

function EvidenceSection({ report }: { report: Report }) {
  const e = report.evidence || {};
  const ai = report.ai_interpretation;
  const parsed = ai?.parsed_result;
  const signals = (report.deterministic_findings || []).flatMap((f) => f.signals || []);
  const reviews = asList(report.review_notes?.reviews);
  const notes = asList(report.review_notes?.examiner_notes);
  return <article className="evidence-block space-y-4">
    <h2 className="text-2xl font-bold">{text(e.original_filename, text(e.id))}</h2>
    <dl className="grid gap-1 sm:grid-cols-2">{[["Evidence ID", e.id], ["Media type", e.media_type], ["File size", e.file_size], ["Processing status", e.processing_status]].map(([label, value]) => <div key={String(label)}><dt className="font-semibold">{String(label)}</dt><dd>{text(value)}</dd></div>)}</dl>
    <div><h3 className="font-semibold">SHA-256</h3><p className="font-mono">{text(report.hash?.sha256_original || e.sha256_original)}</p><p className="text-sm">{DISCLAIMER}</p></div>
    <div><h3 className="font-semibold">Deterministic findings</h3><table className="w-full border-collapse text-sm"><thead><tr><th className="border p-2 text-left">Check</th><th className="border p-2 text-left">Result</th><th className="border p-2 text-left">Details</th></tr></thead><tbody>{signals.length ? signals.map((s, i) => <tr key={i}><td className="border p-2">{text(s.check)}</td><td className="border p-2">{text(s.result)}</td><td className="border p-2">{compact(s.details)}</td></tr>) : <tr><td colSpan={3} className="border p-2">No findings recorded.</td></tr>}</tbody></table></div>
    <div><h3 className="font-semibold">AI interpretation (advisory)</h3>{parsed ? <dl className="space-y-1">{["summary", "anomalies", "uncertainty", "limitations", "next_steps", "review_priority"].map((key) => <div key={key}><dt className="font-semibold capitalize">{key.replaceAll("_", " ")}</dt><dd>{compact(parsed[key])}</dd></div>)}</dl> : <p>AI analysis incomplete: {text(ai?.error_message, "not run")}. Deterministic findings above are unaffected.</p>}{ai?.ai_model && <p className="text-sm">Model used: {ai.ai_model}</p>}</div>
    <div><h3 className="font-semibold">Review notes</h3>{reviews.length ? <ul className="list-disc pl-5">{reviews.map((r, i) => <li key={i}>{compact(r)}</li>)}</ul> : <p>No reviews recorded.</p>}{notes.length ? <ul className="mt-1 list-disc pl-5">{notes.map((n, i) => <li key={i}>{compact(n)}</li>)}</ul> : <p>No examiner notes recorded.</p>}</div>
    <div><h3 className="font-semibold">Custody history</h3><ol className="space-y-1">{(report.custody_history || []).slice().sort((a, b) => String(a.event_time).localeCompare(String(b.event_time))).map((item, i) => <li key={i}>{text(item.event_time)} — {text(item.event_type)} — actor {text(item.actor_user_id)}</li>)}</ol></div>
    <div><h3 className="font-semibold">Limitations</h3><ul className="list-disc pl-5">{(report.limitations || []).map((item, i) => <li key={i}>{item}</li>)}</ul></div>
  </article>;
}

export default function PrintableCaseReport() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const listResponse = await fetch(`/api/cases/${id}/evidence`, { credentials: "same-origin", cache: "no-store" });
      const listBody = await listResponse.json();
      if (!listResponse.ok) throw new Error(listBody?.error || "Unable to load evidence.");
      const evidence: { id: string }[] = listBody.evidence || listBody.data || [];
      const loaded = await Promise.all(evidence.map(async (ev): Promise<Item> => {
        try {
          const response = await fetch(`/api/cases/${id}/evidence/${ev.id}/report`, { credentials: "same-origin" });
          const body = await response.json();
          if (!response.ok) throw new Error(body?.error || "Report unavailable");
          return { id: ev.id, report: body };
        } catch (caught) {
          return { id: ev.id, error: caught instanceof Error ? caught.message : "Report unavailable" };
        }
      }));
      setItems(loaded);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load the report."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <main className="p-8">Loading case report…</main>;
  if (error) return <main className="p-8"><h1 className="text-xl font-bold">Unable to load report</h1><p className="my-4">{error}</p><button onClick={() => void load()} className="no-print rounded bg-slate-900 px-4 py-2 text-white">Retry</button></main>;

  const downloadPdf = () => {
    const previousTitle = document.title;
    document.title = `Case Evidence Report - ${id}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  };

  return <>
    <style>{`@media print { .no-print, nav { display:none !important } body { background:#fff; color:#000 } article, table { break-inside:avoid } .evidence-block + .evidence-block { break-before:page } main { margin:0.5in } } * { overflow-wrap:anywhere }`}</style>
    <main className="mx-auto max-w-4xl space-y-8 bg-white p-6 text-slate-900">
      <div className="no-print flex gap-3"><button type="button" onClick={downloadPdf} className="rounded bg-slate-900 px-4 py-2 text-white" aria-label="Download PDF using the browser print dialog">Download PDF</button><button onClick={() => router.back()} className="rounded border px-4 py-2">Back</button></div>
      <div><h1 className="text-3xl font-bold">Case Evidence Review Report</h1><p>Case ID: {text(id)}</p><p>Generated: {new Date().toLocaleString()}</p><p>Evidence items: {items.length}</p><p className="mt-2 text-sm">This report is an investigative aid. It does not establish identity, provenance, legal admissibility, or an authenticity conclusion.</p></div>
      {items.length === 0 && <p>No evidence has been registered for this case.</p>}
      {items.map((item) => item.report ? <EvidenceSection key={item.id} report={item.report} /> : <article key={item.id} className="evidence-block"><h2 className="text-xl font-bold">Evidence {item.id}</h2><p>Report could not be loaded: {text(item.error)}</p></article>)}
    </main>
  </>;
}
