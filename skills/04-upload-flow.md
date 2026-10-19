# 04 · Upload flow

Three API routes. Each starts with `requireMember` (skill 02). Limits come from `worker/limits.json` (skill 19).

## 1. `POST /api/evidence/upload-url`
Body: `case_id`, `declared_mime`, `declared_size`. Roles: `investigator`, `uploader`.
1. Reject if `declared_mime` isn't in the allow-list (`image/jpeg`, `image/png`, `video/mp4`) or the size is over the cap for that type.
2. Generate `evidence_id` on the server. Take the extension from a MIME-to-extension map, never from the client filename.
3. `path = ${case_id}/${evidence_id}/original.${ext}`
4. Insert the `Evidence` row: `processing_status='awaiting_upload'`, `storage_key=path`, `uploaded_by`, `declared_mime`.
5. Return a signed upload URL:

```ts
const { data } = await supabaseAdmin.storage
  .from('evidence-originals').createSignedUploadUrl(path);   // { signedUrl, token, path }
return { evidence_id, token: data.token, path };
```

## 2. Browser upload
```ts
await supabase.storage.from('evidence-originals').uploadToSignedUrl(path, token, file);
```
Never use `upsert`, so an upload can't overwrite an original. The browser may pre-check size and type for friendlier errors, but that's UX only.

## 3. `POST /api/evidence/finalize`
Body: `evidence_id` plus source and collection details. **Derive the path from the stored row, never from the request.**
1. Load the row. It must be in `awaiting_upload` and belong to a case the caller can write to.
2. Confirm the object exists in the bucket (storage `exists`/`list` for that path). If not, return an error and leave the row as is.
3. Save provenance, labeled as reported. Set `processing_status='queued'`.
4. Call the worker server-side:

```ts
await fetch(`${process.env.PROCESSING_URL}/process`, {
  method: 'POST',
  headers: { 'X-Worker-Secret': process.env.WORKER_SHARED_SECRET!, 'content-type': 'application/json' },
  body: JSON.stringify({ evidence_id }),
  signal: AbortSignal.timeout(90_000),     // cold start can take about a minute
}).catch(() => { /* leave 'queued'; the UI shows "waiting for analysis service" + Retry */ });
```

## 4. `POST /api/evidence/:id/retry`
Allowed when `processing_status='failed'`, or `queued` for more than about 3 minutes. Never for `rejected` or `awaiting_upload`. Set `queued`, then call the worker the same way. The worker's atomic claim makes a double call harmless.

Also ping `GET /health` on the worker when the upload page opens, so a sleeping instance wakes early.

Done when: no file passes through a Vercel function body, a second upload to the same path fails, a forged `evidence_id` from another case is refused, and a missing object blocks finalize.
