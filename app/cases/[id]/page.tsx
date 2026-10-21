
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireCaseRole } from "@/lib/authz";

type CasePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CasePage({
  params,
}: CasePageProps) {
  const { id } = await params;

  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot always write cookies.
          // Middleware or a Route Handler should handle refreshes.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie writes may be unavailable in Server Components.
          }
        },
      },
    }
  );

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
    </main>
  );
}
