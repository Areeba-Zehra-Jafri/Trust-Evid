# 13 · Report

Generate in Next.js: JSON first, then PDF from the same object.

**PDF library:** `pdf-lib` has no automatic text wrapping, so use `@react-pdf/renderer`, which wraps. Confirm it runs in a Next.js route on Day 3. If it fights the serverless build, fall back to a print-styled HTML report page. The JSON is the primary structured output either way.

## Sections, in this order
1. Evidence details and reported provenance (labeled "reported")
2. Integrity status and last verification time
3. Deterministic findings (observed, not observed, not available) and the rule-based review priority
4. AI interpretation, labeled advisory, with its own priority (or "Analysis incomplete: reason")
5. Examiner notes, if any
6. Limitations (skill 01 block)
7. Custody history, chain-verification result, **chain head hash, event count, and generated-at time**

The head hash and count let a reader who recorded them earlier spot truncated history. State in the report that they are only meaningful against an earlier record.

Each report download appends a `download` custody event. Visually separate computed results, AI interpretation and examiner notes.

Done when: the sections are visibly separate, the limitations block and chain head appear in both JSON and PDF, and a long finding wraps instead of running off the page.
