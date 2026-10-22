# CONTEXT.md
Last updated: Phase 1 · Chunk 0 and Chunk 2 implementation update

## Done
- Initial frontend audit and the previously completed Batch 1/1b/2 work remain unchanged.
- Chunk 0 full-read audit completed for the requested routes, case page, worker modules, and relevant migrations. No obviously spliced or duplicated code was found in those files; known contract mismatches are recorded below.
- Chunk 2 UI/API alignment applied: evidence insertion now explicitly sets `owner_user_id` from the verified session; the evidence workspace uses `processing_status`, `original_filename`, `media_type`, and `file_size`; finalize now dispatches `/process` after upload finalization.
- No database migration, worker request/response contract, dependency, or environment variable was changed.

## In progress
- TypeScript checking and the Next.js build are NOT RUN because this tool environment has no command runner; no passing result is claimed.
- Browser flow, tests, and worker startup remain pending.
- The finalize route still uses the existing service-role direct persistence path and does not yet invoke the held atomic RPC; this is outside the approved Chunk 2 UI alignment and requires the next protected-custody phase.
- Worker verification found it claims uploaded/awaiting_upload and sets ready in `persist_result`; worker contract was not changed.
- Existing AI route sends a user access token to the worker; this remains an open security issue requiring separate approval and was not changed in Chunk 2.

## Next
1. Run `npx tsc --noEmit` and `npx next build` in an environment with command execution; address any failures.
2. Run the relevant test suite and verify finalize -> process -> ready in the deployed environment.
3. Obtain approval before touching custody_events, revoking grants, changing FK behavior, changing worker contracts, or addressing the AI token handoff.

## Scope note
This update records the status after Batch 1 and Batch 1b authentication changes plus the static browser-client refactor. No database migration, worker change, package change, or unrelated route change was made for Phase 5.
