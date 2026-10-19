# CONTEXT.md
Last updated: before Day 1 · planning finished · nothing built yet

## State
Planning is done and the stack is locked. The docs exist (AGENT.md, SKILLS.md index, 19 files in /skills, worker/limits.json). No application code yet. Next is repo setup and the Day-1 smoke test.

## Done
- SPEC.md (pitch), AGENT.md (rules), SKILLS.md + skills/01-19 (playbooks), worker/limits.json (caps), this file

## In progress
- Nothing

## Next (in order)
1. Create the repo structure from AGENT.md. Add `.env.example`, `.gitignore`, and a short README.
2. Smoke test (skills/15): minimal Render worker (`/health` + ffprobe), then the largest demo video through browser, storage, worker and hash match. Record decode time and peak memory here and tune `worker/limits.json`.
3. Supabase project: TOTP on, migrations for schema + `case_members` + RLS (skill 02), buckets, custody functions (skill 03).
4. Auth + 2FA screens, case creation, upload flow (skill 04), basic dashboard.

## Decisions (locked)
- Web on Vercel Hobby (Next.js + TypeScript); Supabase for auth (TOTP only), Postgres + RLS, private Storage
- Worker: FastAPI in Docker on Render free, created through the dashboard (no card); Gemini free tier called from the worker
- Custody chain in Postgres (locking SQL function, no INSERT/UPDATE/DELETE for app roles); verification runs via the API with the service role
- 2FA enforced by restrictive `aal2` RLS and again in every service-role API route
- Roles per case in `case_members`; browsers are select-only; all writes go through the API or worker
- Status model includes `awaiting_upload` and `rejected`; rejected is final, reason JSON in `evidence.error`
- Intake `custody` event is written by the worker after validation, only if none exists
- Rule-based review priority from weighted findings; AI priority is advisory and can't lower it; ELA is informational (weight 0)
- All caps live in `worker/limits.json`
- Report: JSON + PDF via `@react-pdf/renderer` (verify on Day 3, fallback print-styled HTML)
- No `transfer` events, no TUS uploads, no extra forensic libraries

## Gotchas
- Vercel function bodies cap at 4.5 MB, so files upload straight to Storage with signed URLs
- Supabase free: 50 MB per file, 1 GB total, projects pause after 7 idle days
- Render free: 512 MB RAM, 0.1 CPU, sleeps after 15 idle minutes (first request about a minute)
- Gemini free tier may use inputs for training, so synthetic data only
- Gemini 2.5 models were scheduled for shutdown on 16 Oct 2026, so use a Gemini 3 model

## Limits tuned
- Not measured yet. Values in `worker/limits.json` are starting guesses.

## Map
- /AGENT.md rules · /SKILLS.md index · /skills/NN-*.md playbooks · /SPEC.md product spec · /CONTEXT.md this file
- /worker/limits.json caps (app and worker folders not created yet)

## Open questions
- Does the organizers' definition of a "code gig" match the custody-chain and AI-validation modules?
- Which Gemini 3 model id is free for our key? (check in AI Studio)

## Deploy state
- Web: not deployed · Worker: not deployed · Last smoke test: not run
