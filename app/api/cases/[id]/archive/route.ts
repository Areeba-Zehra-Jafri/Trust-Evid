
import { NextResponse } from "next/server";
import { requireAal2User, requireCaseRole } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireAal2User(req);
  const { id: caseId } = await params;

  const role = await requireCaseRole(caseId, user.id, ["investigator"]);

  if (!role) {
    const memberCheck = await requireCaseRole(caseId, user.id, [
      "investigator",
      "uploader",
      "examiner",
    ]);

    if (!memberCheck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: caseData, error: fetchError } = await supabaseAdmin
    .from("cases")
    .select("status")
    .eq("id", caseId)
    .single();

  if (fetchError || !caseData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (caseData.status === "archived") {
    return NextResponse.json(
      { error: "Conflict: already archived" },
      { status: 409 }
    );
  }

  if (!["open", "closed"].includes(caseData.status)) {
    return NextResponse.json(
      { error: "Invalid case status for archiving" },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("cases")
    .update({ status: "archived" })
    .eq("id", caseId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return new Response(null, { status: 200 });
}
