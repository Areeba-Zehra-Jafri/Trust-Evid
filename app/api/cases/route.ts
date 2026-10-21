import { NextResponse } from "next/server";
import { requireAal2User } from "@/lib/authz";
import { validateNewCase } from "@/lib/validate-case";

export async function GET(req: Request) {
  try {
    const { supabase } = await requireAal2User();

    const { data: cases, error } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(cases, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireAal2User();
    const body = await req.json();

    const errors = validateNewCase(body);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { data, error } = await supabase.rpc("create_case_with_owner", {
      p_user: user.id,
      p_title: String(body.title ?? ""),
      p_ref: String(body.reference_number ?? body.reference ?? body.ref ?? ""),
      p_desc: String(body.description ?? ""),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "reference_number must be unique" },
          { status: 409 }
        );
      }

      if (error.code === "42501") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
