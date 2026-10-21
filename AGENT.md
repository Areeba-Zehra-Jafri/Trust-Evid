# AGENT.md — TRUST-EVID AI

You're building TRUST-EVID AI: a 3-day hackathon prototype that helps investigators triage digital evidence (images and video) with explainable forensic signals, file-integrity verification, and a tamper-evident custody log. It is a triage aid. It never decides authenticity, guilt, or admissibility. That restraint is the product's main selling point, so protect it.

The project is graded on one complete, working, honest workflow. Finishing the core loop beats starting extras.

## Read order

1. This file, fully. It's short on purpose.
2. `CONTEXT.md`: current state of the build (done, decisions, next steps). Trust it instead of re-exploring the repo, and dig into code only when the task needs it.
3. `SKILLS.md`: a one-page index. Open **exactly one** file in `/skills` that matches your current task. Don't load the others.
4. `SPEC.md`: only the section you're working on. Section numbers are used below.

Token budget is limited. Don't re-read files you've already read, don't print large outputs, and prefer small edits over rewrites. If this file and a skill disagree, this file wins.

## Session protocol

Chats start cold, so the repo carries the memory.

- **Start:** read this file and `CONTEXT.md` from disk. Don't scan the repo to rebuild context.
- **During:** after each finished subtask, make a small edit to `CONTEXT.md` (Done / In progress / Next). A build can be cut off at any point, so the file must never lag behind the code.
- **End, as your last action and before any push:** rewrite `CONTEXT.md` following `skills/18-context-handoff.md`. Rewrite, don't append. Pull first and merge facts if a teammate changed it. The final reply ends with `CONTEXT.md updated: yes` or `CONTEXT.md updated: no (reason)`. A task isn't finished until this is done.
- **If you ran out of budget or stopped early,** still update `CONTEXT.md` and list exactly what's left under "In progress". An unfinished task with a current `CONTEXT.md` is fine. A finished task with a stale one isn't.
- If `CONTEXT.md` and the code disagree, the code is right. Fix `CONTEXT.md`.
- Locked decisions in `CONTEXT.md` aren't reopened unless the user asks.

## Non-negotiables

If a task conflicts with one of these, stop and flag it instead of working around it.

1. **Never say "authentic".** No badge, label, string, or prompt text claims a file is genuine because no anomalies were found. A clean result reads: "No anomalies detected by the checks run", followed by limitations.
2. **Never say "fake" or "deepfake" either.** Use "observed anomaly" and "warrants further examination". Review priority is a triage bucket, not a probability.
3. **Three result types stay separate** everywhere (DB columns, API shapes, UI sections, report sections): deterministic findings, AI interpretation, human examiner notes.
4. **No fake AI output.** On provider error, timeout, rate limit, or invalid output, mark the AI analysis `incomplete`, show deterministic findings, and say so. Never fall back to canned text.
5. **The model never invents measurements** or claims checks the backend didn't run. It receives real findings with IDs and must cite them.
6. **A hash match means the bytes match the registered hash.** It doesn't prove the file was genuine before intake.
7. **User-supplied provenance is "reported", not "verified".**
8. **No accuracy or detection-rate claims** unless we evaluate on a labeled set and publish the method.
9. **No claims of agency partnership or deployment** in README, UI copy, or seed data.
10. **Synthetic demo data only.** Never commit real evidence. The Gemini free tier may use inputs to improve Google's models.
11. **Originals are immutable.** Nothing modifies or overwrites an uploaded original. `sha256_original` is written once, and a database trigger blocks any later change.
12. **The service-role key bypasses RLS.** Every API route that uses it must first verify the caller's session, that the session is `aal2`, and that the caller is a member of the case with the right role. Never trust ids, paths or roles from the request body.

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Web | Next.js (app router) + TypeScript, Tailwind, shadcn/ui, on Vercel Hobby | Fast responsive UI, free deploy |
| Auth + 2FA | Supabase Auth, TOTP only | TOTP is free and built in. SMS MFA is a paid add-on. |
| Database | Supabase Postgres + RLS | Isolation and 2FA enforced at the database, not just the UI |
| Evidence storage | Supabase Storage, private buckets | RLS-aware, signed URLs, free tier |
| Forensic worker | Python + FastAPI in Docker on a Render free web service | ffmpeg and OpenCV can't run on Vercel functions |
| AI | Gemini free tier, one model id in one config constant, called from the worker | Multimodal, free, swappable if organizers give credits |
| Report | JSON + PDF (`@react-pdf/renderer`, wraps text) from Next.js | Machine-readable and human-readable. Check it on Day 3. Fallback: a print-styled HTML report. |
| Tests / CI | pytest, Vitest, SQL tamper tests, GitHub Actions | Maps to the acceptance criteria |

Don't swap or add services without asking. No queue, no Redis, no ORM, no blockchain.

## System at a glance

```
Browser --signed URL--> Supabase Storage (evidence-originals)
Browser --> Next.js API (Vercel) --server-side fetch + secret--> Render worker
Render worker <--> Supabase Storage + Postgres (service role)
Render worker --> Gemini
Browser reads the evidence row (RLS, select-only) and polls its status
```

Flow:
1. `upload-url`: API verifies session, `aal2`, and membership, checks declared type and size against Limits, creates the `Evidence` row (`awaiting_upload`), and returns a signed upload URL. The storage path is built server-side and the extension comes from the allow-listed MIME type, never the client filename.
2. Browser uploads straight to Storage (Vercel's 4.5 MB body cap means files never pass through the API).
3. `finalize`: API confirms the object exists, saves reported provenance, sets `queued`, and calls the worker.
4. Worker atomically claims the job (`queued` to `processing`), streams and hashes the file, enforces Limits (over-limit becomes `rejected`), then writes `sha256_original` once and appends the `intake` custody event if none exists.
5. Worker extracts metadata, runs deterministic checks, saves findings and the rule-based review priority.
6. Worker calls the AI, validates the output, and saves it.
7. UI shows progress and results by polling.

## Status model (use exactly these values)

- `processing_status`: `awaiting_upload` | `queued` | `processing` | `done` | `failed` | `rejected`
- `deterministic_status`: `pending` | `running` | `done` | `failed`
- `ai_status`: `pending` | `running` | `done` | `incomplete` | `failed`

Transitions: `awaiting_upload` → `queued` (finalize) → `processing` (worker claim) → `done` | `failed` | `rejected`.
- `failed` can be retried. The UI also offers Retry for `queued` rows older than about 3 minutes, which covers jobs lost when the free worker restarted. Retry sets `queued` and re-calls the worker. The worker's atomic claim makes it safe to call twice.
- `rejected` is final. It means the file broke a limit or was the wrong type. The reason is a short JSON code in `evidence.error`, e.g. `{"limit":"video_max_seconds","max":60,"actual":74}`. The user uploads a different file. Don't show Retry.
- A failed AI stage never hides deterministic results.

## Limits (single source of truth: `worker/limits.json`)

Resource limits live in one file. The worker reads it, and the web app imports it. Don't hardcode numbers elsewhere. What exhausts a 512 MB / 0.1 CPU worker is pixels, duration, resolution and frame count, not file bytes. See `skills/19-limits.md` for where each number is enforced. The values are starting guesses: tune them after the Day-1 smoke test, lowering the video caps first. Keep the worst-case job well under 15 minutes, since a free Render service spins down after 15 idle minutes.

## Contracts (details in /skills)

- **Worker (Render).** `GET /health`; `POST /process {evidence_id}` returns `202`; `POST /verify {evidence_id}`. All but `/health` need `X-Worker-Secret`. One job at a time. Anything left `processing` at startup is marked `failed`.
- **Custody chain.** In Postgres: locking append function, pgcrypto SHA-256 over a fixed delimiter-joined string, no INSERT/UPDATE/DELETE for any app role, SQL verify function. Events: `intake`, `analysis`, `review`, `verification`, `download`. Chain verification runs through the API with the service role and returns ok or broken. Only investigators also see the broken sequence and reason.
- **Storage.** `evidence-originals` is write-once and service-role-read. `evidence-derived` holds frames and thumbnails behind signed URLs. Buckets allow JPEG, PNG, MP4 only, with size limits from Limits. Every download writes a `download` event.
- **Access.** Roles live per case in `case_members` (`investigator`, `uploader`, `examiner`), inserted only server-side, so nobody can self-assign a role. Browsers get select-only RLS access. All writes go through the API or worker. RLS requires `aal2` on every table. Examiners see only evidence assigned to them.
- **Review priority.** A rule-based bucket (low/medium/high) is computed from weighted deterministic findings, so it exists even when the AI fails. The AI's own priority is stored separately as advisory and can never lower the rule-based one.
- **AI.** Input: up to `ai_max_images` selected frames or downscaled images plus findings, with identifying metadata stripped, never the original. Output: pydantic-validated JSON, every cited finding ID must exist, and the text is screened for authenticity claims. One call, plus at most one retry on invalid output. No retry on provider errors. Store model, prompt version, raw and parsed response. `AI_FORCE_FAIL=1` forces a failure.
- **Report.** Evidence details, integrity status, deterministic findings and priority, AI interpretation (or "incomplete"), examiner notes, limitations, custody history, chain head hash, event count, and generated-at time (these expose truncation).

## Traceability: requirement → where → proof

| Requirement | Implemented in | Proven by |
|---|---|---|
| Working 2FA (§8, §12) | Supabase TOTP + `aal2` restrictive RLS + API check | Session without second factor reads nothing and API returns 403 |
| Data isolation (§7.3, §12) | `case_members` + RLS + server authz | Two-account script through UI and direct API calls |
| Server SHA-256 (§7.1) | Worker intake | Stored hash equals `sha256sum` of the file |
| Altered file fails verification (§12) | `/verify` + "verify a local file" | Modified copy mismatches |
| Original immutable | DB trigger + write-once bucket | Update attempt on `sha256_original` errors |
| Tamper-evident custody (§7.2) | Postgres chain functions | SQL tests: edit and reorder both fail verification |
| Live AI, validated, honest failures (§6.2, §6.4) | Worker AI layer | Real call saved; forced failure and bad output end `incomplete` |
| Resource limits | `worker/limits.json`, enforced at four layers | Oversize, over-duration and over-pixel files end `rejected` with a code |
| Separation of results (§11) | Separate columns, fields, report sections | Report inspection |
| Downloadable report (§8) | Next.js JSON + PDF | Download and check sections |

## Known limitations (state these in the README)

- A privileged database admin could rewrite the whole custody history, and deleting trailing events isn't detectable without an external anchor. The report shows the chain head and event count to make truncation visible to anyone who recorded them earlier.
- The intake hash comes from the stored bytes, so it cannot prove the file was genuine before intake.
- Checks are limited and can false-flag normal export or re-encoding. Static CCTV scenes legitimately produce near-identical frames. ELA is informational only and doesn't affect priority.
- Priority weights and thresholds are starting guesses, not calibrated.
- Rejected files stay in the write-once bucket.
- The free-tier worker is slow and sleeps when idle.
- No labeled evaluation set, so no accuracy claims.

## Build order

0. **Smoke test first.** Deploy a minimal worker (`/health` + ffprobe) to Render and push the largest demo video through browser, storage, worker and hash match. Record decode time and memory in `CONTEXT.md`, then tune `worker/limits.json`.
1. **Day 1:** auth + TOTP, schema + RLS, `case_members`, buckets, case creation, upload flow, hashing, metadata, basic dashboard.
2. **Day 2:** image checks, video checks, findings and priority, AI call, hash verify, custody functions, analysis and integrity views. Extract code gig 1.
3. **Day 3:** end-to-end flow, thin examiner view, report, failure-path tests, deployment, docs. Code gig 2. Verify the final submission.

Don't start the next day's items until the current day's flow works end to end.

## Definition of done

- Register, sign in, complete 2FA; a session without 2FA is blocked by RLS and by the API
- Create a case and still see it after signing out and back in
- Upload an image or video with source details; server hash stored
- Over-limit and wrong-type files end `rejected` with a clear reason
- Analysis calls the real model and saves its real structured output
- User A can't see user B's cases or evidence, through the UI or a direct API call
- Verifying an altered copy fails
- Editing or reordering a custody event (as a privileged user in a test) fails chain verification
- AI failures show an `incomplete` state with deterministic findings and rule-based priority intact
- Report downloads and separates findings, AI interpretation, and limitations

## Working style

- Small, focused commits with clear messages (`feat:`, `fix:`, `test:`, `docs:`). Organizers check incremental history, so don't squash.
- Two required code gigs: the hash/custody-chain module and the AI-output-validation module. Each is standalone with its own short README and example.
- Test the integrity-critical parts (hash, chain, authz, AI failure, limits). Skip tests for trivial UI.
- Check current limits in the docs on Day 1: Supabase file size and MFA, Gemini rate limits and image size, Render memory.
- Ambiguous requirement, or a task that would break a non-negotiable? Ask. Don't guess. After two failed attempts at the same problem, stop and ask.
- README and docs: short, plain, accurate. No overclaiming.

## Out of scope

Public victim uploads, agency/court/lab integrations, certification or admissibility, guaranteed deepfake detection, model training, blockchain, mobile apps, extensions, audio/chat/PDF analysis, offline intake, `transfer` events, resumable (TUS) uploads, extra forensic libraries beyond the skills.
