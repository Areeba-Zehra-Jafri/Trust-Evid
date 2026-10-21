# Trust-Evid

Trust-Evid is a Next.js 14 application using the App Router and Supabase for authentication.

## Overview
- Case and evidence management system with hash-chained custody logs.
- Uses Supabase for email/password authentication with mandatory TOTP 2FA (AAL2 level).

## Current Phase 4 Setup
- Email/password login with Supabase Auth.
- MFA enrollment and verification pages placed correctly under `/auth/mfa/enroll` and `/auth/mfa/verify`.
- Middleware protects `/dashboard` and `/cases/*` routes, redirecting to login or MFA flows as needed.
- Navbar shows real session user and sign-out button.
- StubBanner component removed.
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

## Notes
- Database migration is locked and not changed in this phase.
- No new dependencies added beyond what's in package.json.
- TypeScript checked with `npm run typecheck` and build with `npm run build` completed successfully.

---

MFA enrollment and verification are available at `/auth/mfa/enroll` and `/auth/mfa/verify`, with client-side Supabase Auth calls and TOTP QR setup.