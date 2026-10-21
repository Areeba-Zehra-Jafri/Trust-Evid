
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAal2User } from "@/lib/authz";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { validateNewCase } from "@/lib/validate-case";

async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes may not be available in every server context.
        }
      },
    },
  });
}

export async function GET(req: Request) {
  try {
    await requireAal2User(req);
    const supabase = await getSupabaseClient();

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
  } catch {
    return NextResponse.json(
      { error: "Authentication or request failed" },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await requireAal2User(req);
    const body = await req.json();

    const validation = validateNewCase(body);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    const { data, error } = await supabase.rpc("create_case_with_owner", {
      p_user: user.id,
      p_title: body.title,
      p_ref: body.reference_number,
      p_desc: body.description,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "reference_number must be unique" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Authentication or request failed" },
      { status: 401 }
    );
  }
}
