# Trust-Evid

Trust-Evid is a Next.js 14 application using the App Router and Supabase for authentication.

## Overview
- Case and evidence management system with hash-chained custody logs.
- Uses Supabase for email/password authentication with mandatory TOTP 2FA (AAL2 level).

## Phase 4: Custody, integrity and examiner workflow
- Protected RPC contracts are added for custody event recording and chain verification.
- Review and examiner-note API routes support review states, priority, limitations, and audit notes.
- The migration is held for approval in the Database panel; until applied, these routes return schema errors.
- Prototype limitation: chain verification checks stored event presence/order only and does not establish authenticity or legal admissibility.

## Phase 3: Deterministic forensic processing
- The FastAPI worker performs bounded SHA-256, image metadata/EXIF, video ffprobe metadata, and deterministic frame sample records.
- `POST /api/cases/[id]/evidence/process` creates a short-lived private Storage URL and orchestrates processing.
- Findings are persisted separately in `processing_findings`; deterministic results are not AI interpretation and do not assert authenticity.
- Configure the worker with `WORKER_URL` and `WORKER_SHARED_SECRET`.

## Phase 2: Evidence intake and storage
- AAL2-protected case evidence endpoint creates metadata and signed private Storage upload URLs.
- Browser computes SHA-256 before finalization; finalize records the hash and intake custody event.
- Supported media and size limits are read from `worker/limits.json`.
- The required Supabase evidence/custody/storage migration is awaiting approval in the Database panel.

## Phase 1: Foundation stabilization
- Email/password login with Supabase Auth.
- MFA enrollment and verification pages placed correctly under `/auth/mfa/enroll` and `/auth/mfa/verify`.
- Middleware protects `/dashboard` and `/cases/*` routes, redirecting to login or MFA flows as needed.
- Navbar shows real session user and sign-out button.
- The removed placeholder banner is no longer part of the application UI.
- Stub data store remains in use for cases as a placeholder until the database phase.

## Running the Project
```bash
npm install
npm run dev
```

Open http://localhost:3000 to view.

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- WORKER_URL
- WORKER_SHARED_SECRET

Set these in the workspace Secrets panel.

## Phase 6: Reports, deployment and acceptance
- AAL2-protected report download is available from each case at `/api/cases/[id]/report`.
- Reports include visible evidence, deterministic findings, review priorities, examiner notes, custody events, and explicit limitations. JSON is intentional and can be printed or archived without claiming authenticity or legal admissibility.
- Case pages provide responsive review, custody verification, and report controls. Use the browser and API smoke checks below before deployment.

### Acceptance smoke checks
1. `npm run typecheck` and `npm run build` must pass.
2. Without a session, dashboard, case, evidence, chain, AI, and report endpoints must reject access.
3. With two AAL2 users, each user must be unable to read or mutate the other user's case/evidence.
4. Exercise invalid media type/size, expired upload, worker timeout, malformed AI response, and custody tamper checks; each must return a safe error and must not expose secrets.
5. Download a report and confirm it contains the case, hashes/findings, review notes, custody events, and limitations.
6. Verify Vercel build logs and Render `/health` plus worker logs using the deployment dashboards; no deployment credentials belong in this repository.

## Notes
- Database migration is locked and not changed in this phase.
- No new dependencies added beyond what's in package.json.
- TypeScript checked with `npm run typecheck` and build with `npm run build` completed successfully.

---

MFA enrollment and verification are available at `/auth/mfa/enroll` and `/auth/mfa/verify`, with client-side Supabase Auth calls and TOTP QR setup.