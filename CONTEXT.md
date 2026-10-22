# CONTEXT.md
Last updated: Phase 3 · Protected custody logging caller audit

## Done
- Initial frontend audit and previously completed Batch 1/1b/2 work remain unchanged.
- Chunk 0 full-read audit completed for the requested routes, case page, worker modules, and relevant migrations. No obviously spliced or duplicated code was found in those files; known contract mismatches remain recorded below.
- Chunk 2 UI/API alignment applied: evidence insertion explicitly sets `owner_user_id` from the verified session; the evidence workspace uses `processing_status`, `original_filename`, `media_type`, and `file_size`; finalize dispatches `/process` after upload finalization.
- Chunk 1 protected custody database changes are treated as already applied live and committed by the user: the custody RPC is service-role-only with explicit `p_actor_user_id`; direct authenticated/anonymous custody mutation is not allowed; UPDATE, DELETE, and TRUNCATE are blocked; and a partial unique index permits one intake event per evidence (duplicate attempts use SQLSTATE 23505).

## Chunk 1 caller audit (read-only)
The repository-wide custody caller audit found these references; no hit was changed:

- `supabase/migrations/20261021065232_custody_examiner_workflow.sql`: legacy migration definition and grants for `record_custody_event(p_case_id, p_evidence_id, p_event_type, p_hash, p_details)`. This is the old five-argument form and relies on `auth.uid()`. It is historical migration text and was not edited.
- `app/api/cases/[id]/evidence/[evidenceId]/chain/route.ts`: calls `verify_custody_chain`, not `record_custody_event`. This route must not be treated as a custody writer; the verification function is a known stub and must not be presented as proving a valid chain.
- `README.md`: descriptive references to custody RPC/verification behavior; no executable caller.

No direct application `insert` into `custody_events` was found in the inspected app, lib, worker, or test sources. No current executable caller using the old five-argument `record_custody_event` form was found outside the historical migration text. No worker or test caller was found. The finalize route was not modified as part of this read-only audit.

## In progress / verification limits
- `npx tsc --noEmit`, `npm run build`, tests, live SQL checks, and branch/commit inspection are NOT RUN in this tool environment because no command runner is available. No passing result is claimed.
- Live function bodies, trigger inventory, grants, and deployed schema were not independently queried here; the live facts above are recorded from the user-supplied confirmation.
- The current finalize route still uses its existing service-role evidence persistence path. This audit does not alter it.

## Next
- Stop after Chunk 1 as required. Do not begin evidence/custody mutation hardening, storage limits, report/export changes, worker contract changes, or any other later phase without explicit authorization.
- Do not use `verify_custody_chain` as evidence that a chain is valid; it is a stub that returns `valid: true` with limitations.

## Scope note
This update records the protected custody logging caller audit only. No migration, route, worker, dependency, environment variable, or unrelated source file was changed.


## Phase 4 — Evidence and custody mutation hardening
- Client mutation audit: evidence intake uses API routes; no browser Supabase evidence update, upsert, or delete mutation was found in the inspected client components. The only evidence rollback mutation is server-side and now marks the row `failed` through `supabaseAdmin`; evidence is never hard-deleted.
- Review custody recording now uses the service-role RPC with the verified session actor (`p_actor_user_id: user.id`); no user access token is sent to the worker.
- Prepared protections: revoke authenticated/anonymous evidence UPDATE and DELETE policies/privileges, and change custody foreign keys to `ON DELETE RESTRICT`. Custody grants, policies, and triggers remain unchanged.
- `verify_custody_chain` remains a stub and must never be presented as proof that a chain is valid.
- Migration application is pending the separately shown evidence-protection and custody-FK migrations. Build, typecheck, tests, and live verification are NOT RUN because no command runner is available.
