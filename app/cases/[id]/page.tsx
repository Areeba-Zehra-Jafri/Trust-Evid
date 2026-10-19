"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCaseById, deleteCase } from "@/lib/stub-store";
import type { Case } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StubBanner } from "@/components/StubBanner";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseItem, setCaseItem] = useState<Case | null | undefined>(undefined);

  useEffect(() => {
    const found = getCaseById(id);
    setCaseItem(found ?? null);
  }, [id]);

  function handleDelete() {
    if (!confirm("Permanently delete this case?")) return;
    deleteCase(id);
    router.push("/dashboard");
  }

  if (caseItem === undefined) {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (caseItem === null) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-2xl font-bold text-slate-700">Case not found</p>
        <p className="text-sm text-slate-500">
          It may have been deleted, or the page was refreshed and in-memory state was cleared.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={caseItem.title}
        subtitle={`Ref: ${caseItem.referenceNumber}`}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard" className="btn-secondary">
              ← Dashboard
            </Link>
            <button type="button" onClick={handleDelete} className="btn-danger">
              Delete
            </button>
          </div>
        }
      />

      <StubBanner message="Case detail view — in-memory only. Evidence upload, analysis, and custody log land in later phases." />

      {/* Meta card */}
      <div className="card divide-y divide-slate-100">
        <Row label="Status">
          <StatusBadge status={caseItem.status} />
        </Row>
        <Row label="Reference">{caseItem.referenceNumber}</Row>
        <Row label="Created">{formatDateTime(caseItem.createdAt)}</Row>
        <Row label="Last updated">{formatDateTime(caseItem.updatedAt)}</Row>
        <Row label="Evidence items">{caseItem.evidenceCount}</Row>
        {caseItem.description && (
          <Row label="Description">
            <span className="whitespace-pre-wrap text-slate-700">
              {caseItem.description}
            </span>
          </Row>
        )}
      </div>

      {/* Evidence placeholder */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Evidence</h2>
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
          <span className="text-4xl">📁</span>
          <p className="text-sm font-medium text-slate-600">
            Evidence upload — coming in Phase 3
          </p>
          <p className="text-xs text-slate-400">
            Secure file upload with SHA-256 hashing, forensic metadata extraction,
            and chain-of-custody logging.
          </p>
        </div>
      </section>

      {/* Custody log placeholder */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Chain of Custody
        </h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
          Custody event log — coming in Phase 4.
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
      <dt className="w-36 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}
