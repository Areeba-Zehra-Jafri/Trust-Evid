import { NextResponse } from "next/server";
import { requireAal2User, requireCaseRole } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAal2User();
    const { id } = await params;

    const role = await requireCaseRole(id, user.id, [
      "investigator",
      "uploader",
      "examiner",
    ]);
    if (!role) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
