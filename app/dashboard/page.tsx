"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCases, deleteCase } from "@/lib/stub-store"; // TODO: Remove stub-store in Phase 2
import type { Case } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { CaseCard } from "@/components/CaseCard";
import { StubBanner } from "@/components/StubBanner";

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);

  // Load on mount and whenever window gets focus (simulates live updates)
  function refresh() {
    setCases(getCases());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  function handleDelete(id: string) {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    deleteCase(id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigator Dashboard"
        subtitle="All cases you own or are assigned to."
        actions={
          <Link href="/cases/new" className="btn-primary">
            + New Case
          </Link>
        }
      />



      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total cases" value={cases.length} />
        <StatCard
          label="Open"
          value={cases.filter((c) => c.status === "open").length}
          accent="text-green-700"
        />
        <StatCard
          label="Closed"
          value={cases.filter((c) => c.status === "closed").length}
        />
        <StatCard
          label="Evidence items"
          value={cases.reduce((n, c) => n + c.evidenceCount, 0)}
        />
      </div>

      {/* Case list */}
      {cases.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCard key={c.id} caseItem={c} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
      <span className="text-5xl">🗂️</span>
      <div>
        <p className="text-lg font-semibold text-slate-700">No cases yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Create your first case to start cataloging evidence.
        </p>
      </div>
      <Link href="/cases/new" className="btn-primary mt-2">
        Create first case
      </Link>
    </div>
  );
}
