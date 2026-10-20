/**
 * /api/cases — Phase 1 scaffold.
 *
 * In-memory stub. Phase 2 replaces these handlers with Supabase Postgres calls
 * behind a real session + AAL2 check.
 *
 * ⚠️  This endpoint is intentionally unused by the Phase 1 UI (which calls the
 *     stub-store directly). It exists so the route path is reserved and tests
 *     can be written against it in Phase 2 without a breaking rename.
 */

import { NextRequest } from "next/server";
// import { getCases, createCase } from "@/lib/stub-store"; // TODO: Remove stub-store in Phase 2
import { validateNewCase } from "@/lib/validate-case";

export async function GET() {
  return Response.json({ cases: getCases() });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body as {
    title?: string;
    referenceNumber?: string;
    description?: string;
  };

  const errors = validateNewCase(input);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 422 });
  }

  const created = createCase({
    title: input.title!,
    referenceNumber: input.referenceNumber!,
    description: input.description ?? "",
  });

  return Response.json({ case: created }, { status: 201 });
}
