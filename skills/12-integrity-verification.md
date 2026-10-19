# 12 · Integrity verification

Three separate things, kept distinct in the UI.

## 1. Hash verification (worker `/verify`)
Stream the stored original, recompute SHA-256, compare with `sha256_original`, and return `{match, computed, registered, verified_at}`. The API then appends a `verification` custody event. Wording: "Hash matches the value registered at intake." It doesn't say the file was genuine before intake.

## 2. Verify a local file (browser)
Hash a file the user picks and compare it with the registered hash. Nothing is uploaded. This is how the "altered copy fails" demo works, since originals are write-once.

```ts
const buf = await file.arrayBuffer();               // fine within the video size cap
const d = await crypto.subtle.digest('SHA-256', buf);
const hex = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
```

## 3. Chain verification
API route, after `requireMember`:
```ts
const { data } = await supabaseAdmin.rpc('verify_custody_chain', { p_case: caseId });
// return { ok: data[0].ok } to everyone;
// add broken_seq and reason only when role === 'investigator'
```
It runs with the service role on purpose. Through RLS, an examiner sees only some events, which would look like a sequence gap. Never return custody events to an examiner through this route.

Also expose `custody_chain_head` (event count and head hash) for the report (skill 13).

Done when: a one-byte change to a local copy shows a mismatch, and an examiner calling chain verification gets `ok` or `broken` with no event data.
