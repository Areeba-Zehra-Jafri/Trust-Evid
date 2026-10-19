# CONTEXT.md
Last updated: 2026-10-19 · pre-Day 1 · nothing built yet · planning session

## State
Planning is finished and the stack is locked. No application code exists yet. Next: create the repo structure, then run the Day-1 smoke test.

## Done
- SPEC.md (product spec), AGENT.md (rules and contracts), SKILLS.md (index), skills/01-19 (playbooks), this file

## In progress
- Nothing

## Next (in order)
1. Create the repo structure from AGENT.md ("Repo layout"). Add `.env.example` and `worker/limits.json` (skill 19).
2. Smoke test: deploy a minimal worker (`/health` + ffprobe) to Render, then push the largest demo video through browser, storage, worker and hash match. Record decode time and memory here, then tune `worker/limits.json`.
3. Supabase project: TOTP on, migrations for schema, `case_members`, RLS (`aal2`), buckets, custody functions (skills 2 and 3).
4. Auth + 2FA screens, case creation, upload flow (skill 4), basic dashboard.
5. Day 2: spike one sample PDF with `@react-pdf/renderer` on a Vercel deploy. If it fails, use a print-styled HTML report.

## Decisions (locked)
- Web on Vercel Hobby, Next.js + TypeScript: free and fast to build
- Supabase: Auth with TOTP only (SMS MFA is paid), Postgres with RLS, private Storage
- Worker: FastAPI in Docker on Render free, because ffmpeg/OpenCV can't run on Vercel
- AI: Gemini free tier, called from the worker, one model id in config
- Roles live per case in `case_members`, inserted server-side only; browsers get select-only RLS access, all writes go through the API or worker
- 2FA enforced by `aal2` restrictive RLS and re-checked in every API route that uses the service role
- Custody chain lives in Postgres (locking SQL function, no INSERT/UPDATE/DELETE for app roles)
- The `intake` custody event is written by the worker after it hashes the file and passes limit checks. Rejected files get a `rejected` event instead.
- Review priority is rule-based from weighted findings; AI priority is advisory and never lowers it
- All size, pixel, duration and frame limits live in `worker/limits.json`, enforced at four layers
- Formats: JPEG, PNG, MP4 only. `rejected` is final (no Retry); `failed` and stale `queued` can be retried
- Examiner role is thin: assigned evidence + record a review note
- Reports (JSON + PDF) are generated in Next.js
- No `transfer` events, no TUS uploads, no extra forensic libraries

## Gotchas
- Vercel function bodies are capped at 4.5 MB, so files upload straight to Storage with signed URLs
- Vercel Hobby functions run up to 300 s, enough to cover a Render cold start of about 1 minute
- Supabase free: 50 MB per file, 1 GB storage, 5 GB egress, projects pause after 7 idle days
- Render free: 512 MB RAM, 0.1 CPU, sleeps after 15 idle minutes (first request about a minute), ephemeral disk
- Gemini free tier may use inputs for training, so synthetic data only. Per-project rate limits are shown in the AI Studio console.
- Gemini 2.5 models were retired on 16 Oct 2026 and now return 404. Use a Gemini 3 model id. Candidates seen in the docs: `gemini-3.5-flash`, `gemini-3.1-flash-lite`. Preview ids can change.
- On Supabase, pgcrypto usually lives in the `extensions` schema, so qualify `extensions.digest` in functions with a fixed `search_path` (verify in the project)

## Map
- /AGENT.md: rules, contracts, status model, limits
- /SKILLS.md: playbook index; /skills/*.md: one playbook each
- /SPEC.md: product spec
- /CONTEXT.md: this file
- (app, lib, worker, supabase, gigs, tests folders: not created yet)

## Open questions
- Does the organizers' definition of a "code gig" match the custody-chain and AI-validation modules?
- Which Gemini 3 model id is free for our key? (check in AI Studio)
- Does Render free signup require a card? Render's own materials say no; confirm at signup.
- Fallbacks if Render can't handle the largest video: a Hugging Face Docker Space (current docs say compute Spaces need a paid plan; test with a new account), or run the worker locally behind a Cloudflare quick tunnel for demos (URL changes each run; keep it in a config row, not an env var)
- Sync check, grep `skills/` for: `PROCESSING_URL` (now `WORKER_URL`), `pdf-lib` (now `@react-pdf/renderer`), `profiles.role` or `owner_user_id` access rules (now `case_members`), custody event lists (must include `rejected`), hardcoded size or frame numbers (must read limits)

## Deploy state
- Web: not deployed · Worker: not deployed · Last smoke test: not run
