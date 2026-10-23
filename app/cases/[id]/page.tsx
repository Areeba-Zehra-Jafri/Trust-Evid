
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { requireCaseRole } from "@/lib/authz";
import { EvidenceIntake } from "@/components/EvidenceIntake";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ReportPanel } from "@/components/ReportPanel";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { CaseEvidenceWorkspace } from "@/components/CaseEvidenceWorkspace";
import { CaseMembers } from "@/components/CaseMembers";

type CasePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CasePage({
  params,
}: CasePageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const role = await requireCaseRole(id, user.id, [
    "investigator",
    "uploader",
    "examiner",
  ]);

  if (!role) {
    notFound();
  }

  const { data: caseData, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !caseData) {
    notFound();
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">
        {caseData.title}
      </h1>
      <p>{caseData.description}</p>
      {(role === "investigator" || role === "uploader") && <EvidenceIntake caseId={id} />}
      {role === "examiner" && <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Examiner workflow: review findings, record limitations, and preserve notes. This prototype does not establish authenticity or legal admissibility.</p>}
      <CaseMembers caseId={id} canManage={role === "investigator"} />
      <CaseEvidenceWorkspace caseId={id} />
      <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">Select an evidence item above to open its analysis and review controls. Reports remain available for the whole case.</p>
      <ReportPanel caseId={id} />
    </main>
  );
}
