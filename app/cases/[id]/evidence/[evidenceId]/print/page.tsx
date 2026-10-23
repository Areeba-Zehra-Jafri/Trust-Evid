'use client';

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Signal = { check?: string; result?: string; details?: unknown };
type Finding = { processor_version?: string; signals?: Signal[]; limitations?: string[] };
type Report = {
  evidence?: Record<string, unknown>;
  hash?: { sha256_original?: string; disclaimer?: string };
  extracted_metadata?: Record<string, unknown>;
  deterministic_findings?: Finding[];
  ai_interpretation?: { label?: string; status?: string; parsed_result?: Record<string, unknown> | null; error_message?: string; ai_model?: string };
  review_notes?: { reviews?: unknown; examiner_notes?: unknown };
  custody_history?: { event_type?: string; event_time?: string; actor_user_id?: string }[];
  limitations?: string[];
  generated_at?: string;
};

const text = (value: unknown, fallback = "—") => value == null || value === "" ? fallback : typeof value === "object" ? JSON.stringify(value) : String(value);
const compact = (value: unknown) => typeof value === "string" ? value : value == null ? "—" : JSON.stringify(value);
const asList = (value: unknown): unknown[] => Array.isArray(value) ? value : value ? [value] : [];

export default function PrintableEvidenceReport() {
  const params = useParams<{ id: string; evidenceId: string }>();
  const id = params?.id;
  const evidenceId = params?.evidenceId;
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || !evidenceId) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/cases/${id}/evidence/${evidenceId}/report`, { credentials: "same-origin" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || body?.message || "Unable to load the report.");
      setReport(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load the report."); }
    finally { setLoading(false); }
  }, [id, evidenceId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <main className="p-8">Loading report…</main>;
  if (error) return <main className="p-8"><h1 className="text-xl font-bold">Unable to load report</h1><p className="my-4">{error}</p><button onClick={() => void load()} className="no-print rounded bg-slate-900 px-4 py-2 text-white">Retry</button></main>;
  if (!report) return <main className="p-8">No report was returned.</main>;

  const e = report.evidence || {};
  const ai = report.ai_interpretation;
  const parsed = ai?.parsed_result;
  const findings = report.deterministic_findings || [];
  const signals = findings.flatMap((finding) => finding.signals || []);
  const reviews = asList(report.review_notes?.reviews);
  const notes = asList(report.review_notes?.examiner_notes);
  const disclaimer = "Hash match shows bytes match the registered intake version; it does not prove authenticity.";
  const downloadPdf = () => {
    const previousTitle = document.title;
    document.title = `Evidence Review Report - ${text(e.original_filename, evidenceId)}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  };

  return <>
    <style>{`@media print { .no-print, nav { display:none !important } body { background:#fff; color:#000 } section, table { break-inside:avoid } main { margin:0.5in } } * { overflow-wrap:anywhere }`}</style>
    <main className="mx-auto max-w-4xl space-y-6 bg-white p-6 text-slate-900">
      <div className="no-print flex gap-3"><button type="button" onClick={downloadPdf} className="no-print rounded bg-slate-900 px-4 py-2 text-white" aria-label="Download PDF using the browser print dialog">Download PDF</button><button onClick={() => router.back()} className="no-print rounded border px-4 py-2">Back</button></div>
      <div><h1 className="text-3xl font-bold">Evidence Review Report</h1><p>Generated: {text(report.generated_at)}</p></div>
      <section><h2 className="text-xl font-semibold">Report metadata</h2><dl className="grid gap-1 sm:grid-cols-2">{[["Case ID", id],["Evidence ID", evidenceId],["File name",e.original_filename],["Media type",e.media_type],["File size",e.file_size],["Processing status",e.processing_status]].map(([label,value])=><div key={String(label)}><dt className="font-semibold">{String(label)}</dt><dd>{text(value)}</dd></div>)}</dl></section>
      <section><h2 className="text-xl font-semibold">SHA-256</h2><p className="font-mono">{text(report.hash?.sha256_original || e.sha256_original)}</p><p className="text-sm">{disclaimer}</p></section>
      <section><h2 className="text-xl font-semibold">Deterministic findings</h2><table className="w-full border-collapse text-sm"><thead><tr><th className="border p-2 text-left">Check</th><th className="border p-2 text-left">Result</th><th className="border p-2 text-left">Details</th></tr></thead><tbody>{signals.length ? signals.map((s,i)=><tr key={i}><td className="border p-2">{text(s.check)}</td><td className="border p-2">{text(s.result)}</td><td className="border p-2">{compact(s.details)}</td></tr>) : <tr><td colSpan={3} className="border p-2">No findings recorded.</td></tr>}</tbody></table></section>
      <section><h2 className="text-xl font-semibold">AI interpretation (advisory)</h2>{parsed ? <dl className="space-y-1">{["summary","anomalies","uncertainty","limitations","next_steps","review_priority"].map(key=><div key={key}><dt className="font-semibold capitalize">{key.replaceAll("_"," ")}</dt><dd>{compact(parsed[key])}</dd></div>)}</dl> : <p>AI analysis incomplete: {text(ai?.error_message,"not run")}. Deterministic findings above are unaffected.</p>}{ai?.ai_model && <p className="text-sm">Model used: {ai.ai_model}</p>}</section>
      <section><h2 className="text-xl font-semibold">Review notes</h2><p className="font-semibold">Reviews</p>{reviews.length ? <ul className="list-disc pl-5">{reviews.map((r,i)=><li key={i}>{compact(r)}</li>)}</ul> : <p>None recorded.</p>}<p className="mt-2 font-semibold">Examiner notes</p>{notes.length ? <ul className="list-disc pl-5">{notes.map((n,i)=><li key={i}>{compact(n)}</li>)}</ul> : <p>None recorded.</p>}</section>
      <section><h2 className="text-xl font-semibold">Custody history</h2><ol className="space-y-2">{(report.custody_history || []).slice().sort((a,b)=>String(a.event_time).localeCompare(String(b.event_time))).map((item,i)=><li key={i}>{text(item.event_time)} — {text(item.event_type)} — actor {text(item.actor_user_id)}</li>)}</ol></section>
      <section><h2 className="text-xl font-semibold">Limitations</h2><ul className="list-disc pl-5">{(report.limitations || []).map((item,i)=><li key={i}>{item}</li>)}</ul></section>
    </main>
  </>;
}
