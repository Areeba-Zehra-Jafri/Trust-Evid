import { cn } from "@/lib/cn";
import type { CaseStatus } from "@/lib/types";

const STATUS_STYLES: Record<CaseStatus, string> = {
  open:     "bg-green-100 text-green-800",
  closed:   "bg-slate-100 text-slate-700",
  archived: "bg-amber-100 text-amber-800",
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  open:     "Open",
  closed:   "Closed",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
