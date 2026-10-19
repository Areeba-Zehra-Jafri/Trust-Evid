"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCase } from "@/lib/stub-store";
import type { NewCaseInput } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { CaseForm } from "@/components/CaseForm";
import { StubBanner } from "@/components/StubBanner";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSubmit(input: NewCaseInput) {
    setLoading(true);
    // Simulate async call — replace with Supabase insert in Phase 2
    setTimeout(() => {
      const newCase = createCase(input);
      router.push(`/cases/${newCase.id}`);
    }, 300);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Create new case"
        subtitle="Fill in the details below. Reference numbers follow your agency's case-numbering scheme."
      />

      <StubBanner message="Case data is stored in memory only and will reset on page refresh. Database integration lands in Phase 2." />

      <div className="card p-6">
        <CaseForm onSubmit={handleSubmit} loading={loading} />
      </div>

      {/* Scaffolding note for future phases */}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer font-medium hover:text-slate-600">
          What's planned for this page (Phase 2+)
        </summary>
        <ul className="mt-2 list-disc pl-4 space-y-1">
          <li>POST /api/cases → Supabase insert with row-level security</li>
          <li>Server-side session check (Supabase Auth + AAL2 2FA)</li>
          <li>case_members row inserted for the owner (investigator role)</li>
          <li>Audit event: case created</li>
        </ul>
      </details>
    </div>
  );
}
