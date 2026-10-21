# CONTEXT.md
Last updated: Phase 4 · AI handling, packaging, and tests (stabilization pass)

## Done
- Optional Gemini processing is explicitly opt-in and additive to deterministic findings.
- Provider and validation failures are represented as incomplete AI processing when persistence succeeds; deterministic output remains authoritative.
- AI provider responses and inline image inputs now have explicit bounded byte budgets before parsing/transmission.
- Structured AI output is bounded, citation-checked, and screened for unsafe authenticity claims.
- Docker copies the worker runtime import graph and limits.json.
- Focused worker tests cover authentication, exact intake payloads, limits, hashing, AI validation/failure, and packaging contracts.

## In progress
- Test execution and Docker startup were not run because no command runner is available in this workspace.
- Atomic claim, stale recovery, retry semantics, and custody RPC compatibility remain blocked by unverified deployed database contracts.
- AI persistence should be verified against deployed ai_analyses uniqueness/columns; repository migration does not declare a unique evidence_id constraint.

## Next
1. Run `cd worker && pytest` in CI.
2. Run a container startup/health smoke check with required Render secrets.
3. Verify deployed AI schema and add an approved atomic claim/retry contract before claiming lifecycle readiness.

## Decisions
- AI never replaces deterministic findings and never makes authenticity or admissibility claims.
- No frontend, package, migration, or live database changes were made.
- Caller hashes, paths, URLs, tokens, and metadata are not trusted.
