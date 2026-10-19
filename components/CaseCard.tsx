"use client";

import Link from "next/link";
import type { Case } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  caseItem: Case;
  onDelete?: (id: string) => void;
}

export function CaseCard({ caseItem, onDelete }: Props) {
  return (
    <div className="card flex flex-col gap-4 p-5 transition hover:shadow-md">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/cases/${caseItem.id}`}
            className="text-base font-semibold text-brand-700 hover:underline"
          >
            {caseItem.title}
          </Link>
          <p className="mt-0.5 text-xs font-mono text-slate-500">
            Ref: {caseItem.referenceNumber}
          </p>
        </div>
        <StatusBadge status={caseItem.status} />
      </div>

      {/* Description */}
      {caseItem.description && (
        <p className="line-clamp-2 text-sm text-slate-600">
          {caseItem.description}
        </p>
      )}

      {/* Footer row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span>
          Created {formatDate(caseItem.createdAt)} &middot;{" "}
          <span className="font-medium text-slate-600">
            {caseItem.evidenceCount} evidence item
            {caseItem.evidenceCount !== 1 ? "s" : ""}
          </span>
        </span>

        <div className="flex gap-2">
          <Link
            href={`/cases/${caseItem.id}`}
            className="btn-secondary !py-1 !px-3 text-xs"
          >
            View
          </Link>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(caseItem.id)}
              className="btn-danger !py-1 !px-3 text-xs"
              aria-label={`Delete case ${caseItem.title}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
