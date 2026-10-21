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

## Next
1. Run `cd worker && pytest` in CI.
2. Run a container startup/health smoke check with required Render secrets.
3. Verify deployed AI schema and add an approved atomic claim/retry contract before claiming lifecycle readiness.

## Decisions
- AI never replaces deterministic findings and never makes authenticity or admissibility claims.
- No frontend, package, migration, or live database changes were made.
- Caller hashes, paths, URLs, tokens, and metadata are not trusted.
