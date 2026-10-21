import { NextResponse } from "next/server";
import { requireAal2User, requireCaseRole } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user } = await requireAal2User(req);

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
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, { status: 200 });
}
