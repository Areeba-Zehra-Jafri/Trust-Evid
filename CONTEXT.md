# Trust-Evid CONTEXT (source of truth, as of Oct 22, 2026)

## What it is
Chain-of-custody evidence triage app for a final-year project and DevMarketplace Hackathon 26. Investigators upload images/video, the system hashes them, runs deterministic forensic checks, then Gemini explains the findings. AI is advisory only. It never says "authentic".

## Stack
Next.js 15 on Vercel (main deploys directly, there is no feature branch). Supabase: Postgres, Auth with MFA (aal2 required by RLS on every table), private Storage bucket evidence-originals. Python worker on Render: deterministic checks + Gemini triage.

## Status lifecycle (evidence.processing_status, DB check constraint allows ONLY these)
awaiting_upload -> uploaded -> processing -> ready | failed (rejected also exists).
There is NO 'processed' value. Anything comparing to 'processed' is a bug.
Worker sets processing at start, ready on deterministic success, failed with an error message on failure. AI failure must NOT fail the evidence: deterministic findings stay, AI is marked incomplete.

## Hard rules
- Service-role writes only after session check, aal2 check and case-role check.
- Never send user tokens to the worker. Next to worker auth is the WORKER_SHARED_SECRET header.
- Custody event actor comes from the session, never the request body.
- custody_events is append-only (trigger custody_no_mutation). authenticated has SELECT only. Never grant more.
- Custody events are written only via supabaseAdmin.rpc('record_custody_event', {p_case_id, p_evidence_id, p_actor_user_id, p_event_type, p_hash, p_details}).
- No hard deletes of evidence. Rollback = set processing_status='failed'.
- verify_custody_chain is a stub that returns valid:true. Never display it as "valid". UI shows a read-only custody timeline from custody_events instead.
- Never commit secrets. You cannot run SQL: give SQL to the user as text and never claim it ran.

## Verified working
Login with MFA, case creation, upload to private bucket, finalize (server hashes stored file, compares to client SHA-256, writes sha256_original).

## Known broken or unverified (do not assume fixed)
- No evidence row has ever reached processing or ready. Worker call path is unproven.
- ai/route.ts gate uses 'processed' (wrong, must be 'ready').
- review/route.ts and the upload rollback in evidence/route.ts may use the old custody call or a hard delete.
- "Verify custody chain" buttons fail (permission denied). Plan: remove buttons and chain/route.ts, add custody timeline.
- Unknown: which checks the worker really runs beyond SHA-256, whether Gemini works, whether persist_result writes 'ready'.
- Several migrations are unconfirmed as applied (record_custody_event 6-arg, evidence owner policy drops, storage limits).
- Signup page exists at app/auth/signup/page.tsx but nothing links to it.

## Env vars
Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, WORKER_URL, WORKER_SHARED_SECRET (Preview AND Production).
Render worker: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_SHARED_SECRET, GEMINI_API_KEY, AI_MODEL.
.env.example wrongly lists SUPABASE_URL for the worker.

## Task order
1 audit (read-only) 2 worker 3 ai/review/rollback routes 4 end-to-end test 5 custody timeline 6 signup/invite 7 hardening.
-----

FILE 2: agent.md
-----
# Agent rules (read these every session)
1. Read context.md first. It overrides your assumptions and older notes.
2. Your file reader truncates. For any file over ~150 lines, read it in line ranges and say explicitly if a read was cut off. Never describe code you did not fully see. Say UNVERIFIED instead.
3. Never claim something works unless you saw evidence (log, test output, DB result). You cannot run builds or SQL, so say "needs user to verify".
4. One task per message. Write whole files when asked, verbatim.
5. After any change, reply with: files changed, then the last 5 lines of each file written.
6. Do not invent features, tables, columns or env vars. If something is missing, ask.
7. Do not touch custody_events grants, RLS policies or migrations. Provide SQL as text for the user.
8. Never display "authentic" or "valid" without a real check behind it.
-----