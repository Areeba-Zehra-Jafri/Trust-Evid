# 18 · Context handoff

Every new chat starts with no memory. `CONTEXT.md` at the repo root is the handoff, so the next session doesn't spend tokens re-exploring the repo.

When: at the end of every session, and before any push. **Rewrite the file, don't append.** Keep it under about 70 lines. Facts only, no narration.

## Template
```markdown
# CONTEXT.md
Last updated: Day <n> · <what the session did, in a few words>

## State
One paragraph: what works end to end right now, what doesn't.

## Done
- <feature>: <where it lives> (<test or manual check>)

## In progress
- <task>: <what's left>, <files touched>

## Next (in order)
1. ...

## Decisions (locked)
- <decision>: <short reason>

## Gotchas
- <thing that cost time> and how it was fixed

## Limits tuned
- <limit>: <value> because <measurement from the smoke test>

## Map
- <folder or file>: <what it is>

## Open questions
- <question for the user>

## Deploy state
- Web: <url or not deployed> · Worker: <url or not deployed> · Last smoke test: <result>
```

## Rules
- No secrets, keys or personal data. Env var names are fine.
- No chat timestamps or names pasted from conversations.
- Reference files by path instead of pasting code.
- Delete stale lines. A stale CONTEXT.md is worse than none.
- If it grows past about 70 lines, collapse finished work into one-line summaries.
- **Teammates share this file.** Pull first, then merge facts instead of overwriting. If git reports a conflict, keep both sets of facts and remove only what's now false.
- Commit it with the work it describes: `docs: update CONTEXT.md`.

Done when: a fresh session can read `AGENT.md` plus `CONTEXT.md` and pick up the next task without exploring the repo first.
