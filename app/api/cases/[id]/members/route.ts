import { NextRequest, NextResponse } from "next/server";
import { requireAal2User, requireCaseRole } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";

const roles = ["investigator", "uploader", "examiner"] as const;
type Role = (typeof roles)[number];

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.status === 403 ? "MFA verification required." : "Unauthorized" },
      { status: error.status || 401 },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed" },
    { status: 500 },
  );
}

export async function GET(_: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const { user } = await requireAal2User();
    if (!await requireCaseRole(id, user.id, [...roles])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("case_members")
      .select("user_id, role")
      .eq("case_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const members = await Promise.all((data ?? []).map(async (member) => {
      const result = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      return {
        user_id: member.user_id,
        role: member.role,
        email: result.data.user?.email ?? null,
      };
    }));
    return NextResponse.json({ members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const { user } = await requireAal2User();
    if (await requireCaseRole(id, user.id, ["investigator"]) !== "investigator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body?.role === "string" ? body.role : "";
    if (!email || !roles.includes(role as Role)) {
      return NextResponse.json({ error: "A valid email and role are required." }, { status: 400 });
    }

    const { data: userId, error: lookupError } = await supabaseAdmin
      .rpc("find_user_id_by_email", { p_email: email });
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
    if (!userId) {
      return NextResponse.json(
        { error: "No account with that email. Ask them to sign up first." },
        { status: 404 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("case_members")
      .select("user_id")
      .eq("case_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (existing) return NextResponse.json({ error: "That user is already a member." }, { status: 409 });

    const { error: insertError } = await supabaseAdmin
      .from("case_members")
      .insert({ case_id: id, user_id: userId, role });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
