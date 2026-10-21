# CONTEXT.md
Last updated: Phase 5 · Batch 1-2 status update

## Done
- Initial frontend build audit and implementation plan are complete.
- Batch 1 authentication wrappers are applied: dashboard authentication redirects preserve thrown auth Responses; cases GET/POST preserve unexpected errors; evidence listing and upload handlers use the documented auth wrapper and verified MIME/byte limits.
- Batch 1b authentication wrappers are applied to every exported handler in the specified finalize, process, AI, chain, notes, review, and report routes. Each calls `requireAal2User()` without arguments and preserves thrown `Response` objects.
- The EvidenceIntake refactor is complete: it imports and uses the static `supabaseBrowser` client for signed storage uploads.
- Optional Gemini processing is explicitly opt-in and additive to deterministic findings.
- Provider and validation failures are represented as incomplete AI processing when persistence succeeds; deterministic output remains authoritative.
- AI provider responses and inline image inputs now have explicit bounded byte budgets before parsing/transmission.
- Structured AI output is bounded, citation-checked (including citation types), and screened for unsafe authenticity claims.
- Docker copies the worker runtime import graph and limits.json.
- Focused worker tests cover authentication, exact intake payloads, limits, hashing, AI validation/failure, and packaging contracts.

## In progress
- Type checking and runtime verification remain pending for the completed Batch 1-2 changes.
- Test execution and Docker startup were not run because no command runner is available in this workspace.
- Atomic claim, stale recovery, retry semantics, and custody RPC compatibility remain blocked by unverified deployed database contracts.
- AI persistence and deployed column/RLS behavior remain unverified.
Last updated: Phase 6 transactional finalization tests (extended validation coverage)

## State
Phase 5 provides a local-only `finalize_verified_evidence` RPC and the finalize route delegates persistence to it after worker byte verification. Phase 6 now includes focused Vitest coverage for digest/count validation, authorization, case scoping, first finalization, retry conflicts, rollback-oriented error mapping, custody repeatability, duplicate-history/index safeguards, digest normalization, and the limits of source-contract tests.

## Done
- `tests/finalize-route.test.ts` covers strict input validation, AAL2/role authorization, case-scoped lookup, worker-first verification, worker digest/count forwarding, matching/conflicting retries, malformed worker responses, timeouts, RPC failures, and invalid RPC results.
- `tests/finalize-migration.test.ts` checks the migration text for authentication, fixed search path, locking, relationship, digest/count validation, retry semantics, uniqueness, and no custody deletion/rewrite.
- `tests/finalize-phase6.test.ts` adds focused checks for terminal-state handling, intake digest/count agreement, duplicate-history/index preflight, append-only custody behavior, digest normalization, authorization ordering, and explicit non-proof of PostgreSQL concurrency/rollback.
- Finalization uses the transactional RPC as its sole persistence path.

## In progress
- The migration is local-only and has not been applied to the linked database.
- Tests are written but unexecuted because this workspace has no command runner.

## Next
1. Review historical duplicate intake events read-only before any migration approval.
2. Run `npm test`, `npm run typecheck`, `npm run build`, and `cd worker && pytest` in an environment with command execution.
3. Add disposable-Postgres integration tests with separate sessions to prove rollback, locking, index-definition rejection, ACL behavior, and concurrent finalization.

## Decisions
- Route tests mock auth, worker, and Supabase boundaries; they do not prove live transaction safety.
- Migration tests are source-contract checks, not SQL execution.
- Worker-computed digest and byte count are authoritative; browser digest is optional comparison input.

## Open blockers
- RPC permissions, trigger interaction, historical duplicate compatibility, rollback, and concurrency remain unverified against PostgreSQL.
- No commands were executed in this session.

CONTEXT.md updated: yes
