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
---
Read-only audit. Change NO
---
Task: make the worker actually process evidence. Do not change any Next.js file in this task. First reply with a plan of max 15 lines naming each worker file you will change and why. Wait for my "go".

Required worker behavior:
POST /process {evidence_id}, header X-Worker-Secret must equal WORKER_SHARED_SECRET (constant-time compare), else 401.
1. Set processing_status='processing'.
2. Download the original from evidence-originals with the service role. Recompute SHA-256 and compare to sha256_original. On mismatch set failed with an error message.
3. Deterministic checks, each written as a row in processing_findings with a check name, result, details JSON:
   - images: format, dimensions, EXIF (flag missing or inconsistent fields), simple recompression check.
   - video: ffprobe container/codec/duration/timestamps, sample frames at fixed intervals, flag repeated sampled frames.
4. On success set processing_status='ready'. On any exception set 'failed' and store a short error. Never leave a row stuck in 'processing'.
5. Record a custody event for processing via record_custody_event.
Separate endpoint POST /triage {evidence_id}: requires status 'ready', sends downsized images/frames plus the findings JSON to Gemini (AI_MODEL), validates the response against a fixed schema (summary, anomalies, uncertainty, limitations, next_steps, review_priority), writes ai_analyses. On provider error, timeout or invalid output, write an ai_analyses row marked incomplete with the error. Never substitute canned text and never fail the evidence.
Gemini must be told it may only discuss supplied findings and must not invent measurements. Strip GPS and personal EXIF before sending.
Add GET /health that checks secret-free liveness only.
Fix .env.example so the worker reads NEXT_PUBLIC_SUPABASE_URL.
Report anything in this spec that conflicts with the existing code before changing it.
---
go
---
Build task. Do not ask questions, do not audit. If something is ambiguous, pick the safest option and list the assumption at the end.

DO NOT MODIFY: login, MFA, signup page internals, case creation, the upload-to-storage code, finalize hashing/comparison logic, middleware, any worker/ file, any SQL/migration file.

Rules: service-role writes only after session + aal2 + case-role check. Custody actor = session user, never request body. No hard deletes of evidence. Allowed processing_status values ONLY: awaiting_upload, uploaded, processing, ready, rejected, failed. Never send user tokens to the worker; send header X-Worker-Secret = WORKER_SHARED_SECRET.

Implement these, writing whole files:
1. finalize route: after the existing hash check succeeds and status is 'uploaded', call POST {WORKER_URL}/process with body {evidence_id}. Await it with a 10s timeout (the worker accepts and runs in the background). If the call fails or WORKER_URL/secret is missing, set processing_status='failed' with a short error and return a clear error to the client.
2. evidence/route.ts: the upload rollback must set processing_status='failed', never delete rows or files.
3. ai route (app/api/cases/[id]/evidence/[evidenceId]/ai/route.ts): require processing_status === 'ready' (not 'processed'). Call POST {WORKER_URL}/triage with {evidence_id}. Return the worker result or a clear incomplete-AI message. AI failure never changes evidence status.
4. review route: record custody via supabaseAdmin.rpc('record_custody_event', { p_case_id, p_evidence_id, p_actor_user_id: user.id, p_event_type, p_hash, p_details }) with all six arguments; p_hash is the evidence sha256_original.
5. Delete chain/route.ts and every UI call to it. New read-only route GET /api/cases/[id]/evidence/[evidenceId]/custody returning custody_events ordered by time (session + aal2 + membership checks, examiners only for assigned evidence).
6. New route GET /api/cases/[id]/evidence/[evidenceId]/report returning a JSON report: evidence details, sha256_original, extracted metadata, deterministic findings, AI analysis (clearly labelled AI interpretation or incomplete), review notes, custody history, a limitations section, and the text "Hash match shows bytes match the registered intake version; it does not prove authenticity." Never output the words authentic or valid as a verdict.
7. New route POST /api/cases/[id]/evidence/[evidenceId]/retry that, for status 'failed' with a stored file, resets to 'uploaded' and calls the worker /process again (investigator or uploader only).

End with: files created/changed, assumptions, and anything you did not finish. If you run out of room, say exactly which numbered items remain. Do not say the build is complete if any item is missing.
---
forget any phases you know from now one every prompt i give is a phase
---
Build task. Do not ask questions, do not audit. If something is ambiguous, pick the safest option and list the assumption at the end.

DO NOT MODIFY: login, MFA, signup page internals, case creation, the upload-to-storage code, finalize hashing/comparison logic, middleware, any worker/ file, any SQL/migration file.

Rules: service-role writes only after session + aal2 + case-role check. Custody actor = session user, never request body. No hard deletes of evidence. Allowed processing_status values ONLY: awaiting_upload, uploaded, processing, ready, rejected, failed. Never send user tokens to the worker; send header X-Worker-Secret = WORKER_SHARED_SECRET.

Implement these, writing whole files:
1. finalize route: after the existing hash check succeeds and status is 'uploaded', call POST {WORKER_URL}/process with body {evidence_id}. Await it with a 10s timeout (the worker accepts and runs in the background). If the call fails or WORKER_URL/secret is missing, set processing_status='failed' with a short error and return a clear error to the client.
2. evidence/route.ts: the upload rollback must set processing_status='failed', never delete rows or files.
3. ai route (app/api/cases/[id]/evidence/[evidenceId]/ai/route.ts): require processing_status === 'ready' (not 'processed'). Call POST {WORKER_URL}/triage with {evidence_id}. Return the worker result or a clear incomplete-AI message. AI failure never changes evidence status.
4. review route: record custody via supabaseAdmin.rpc('record_custody_event', { p_case_id, p_evidence_id, p_actor_user_id: user.id, p_event_type, p_hash, p_details }) with all six arguments; p_hash is the evidence sha256_original.
5. Delete chain/route.ts and every UI call to it. New read-only route GET /api/cases/[id]/evidence/[evidenceId]/custody returning custody_events ordered by time (session + aal2 + membership checks, examiners only for assigned evidence).
6. New route GET /api/cases/[id]/evidence/[evidenceId]/report returning a JSON report: evidence details, sha256_original, extracted metadata, deterministic findings, AI analysis (clearly labelled AI interpretation or incomplete), review notes, custody history, a limitations section, and the text "Hash match shows bytes match the registered intake version; it does not prove authenticity." Never output the words authentic or valid as a verdict.
7. New route POST /api/cases/[id]/evidence/[evidenceId]/retry that, for status 'failed' with a stored file, resets to 'uploaded' and calls the worker /process again (investigator or uploader only).

End with: files created/changed, assumptions, and anything you did not finish. If you run out of room, say exactly which numbered items remain. Do not say the build is complete if any item is missing.