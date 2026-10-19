# 06 · Intake: stream, hash, validate

Order matters. Validate before registering anything, and make registration idempotent.

```python
import hashlib, httpx, magic

ALLOWED = {"image/jpeg": "image", "image/png": "image", "video/mp4": "video"}

def fetch_and_hash(signed_url, dest, max_bytes):
    h, n = hashlib.sha256(), 0
    with httpx.stream("GET", signed_url, timeout=60) as r, open(dest, "wb") as f:
        r.raise_for_status()
        for chunk in r.iter_bytes(1 << 20):
            n += len(chunk)
            if n > max_bytes:
                raise Rejected("stream_max_bytes", max_bytes, n)
            h.update(chunk); f.write(chunk)
    return h.hexdigest(), n
```

Steps in `pipeline()`:
1. Create a short-lived signed download URL with the service role.
2. **Stream and hash** with the larger of the two byte caps (the type isn't known yet).
3. **Real type:** `mime = magic.from_file(path, mime=True)`. Not in `ALLOWED` → `Rejected("unsupported_type", actual=mime)`. Differs from `declared_mime` → `Rejected("type_mismatch", declared, mime)`. Never trust the extension.
4. **Per-type byte cap:** over `image_max_bytes` or `video_max_bytes` → `Rejected`.
5. **Pixels or duration, before decoding anything** (skill 19):
   - image: set `Image.MAX_IMAGE_PIXELS = limits["image_max_pixels"]`, open lazily, check `im.size`
   - video: ffprobe, then duration, width, height against limits. A missing duration is `Rejected("unreadable_duration")`.
6. **Only now register.** If `sha256_original` is null, write it. If it exists (a retry), compare. On mismatch, fail the job with "integrity mismatch" and append a `verification` event. Never overwrite.
7. **Append the `intake` event only if none exists** for this evidence (check `custody_events` first). Retries must not add duplicates. The event carries the hash, with `uploaded_by` as the actor.
8. Continue to metadata.

A rejected file gets no custody event. The row ends `rejected` with the code in `evidence.error`, and the file stays in the write-once bucket (say so in the README).

Done when: the stored hash equals `sha256sum` of the same file, a renamed `.exe` is rejected as `unsupported_type`, a retry adds no second intake event, and an over-limit file is `rejected` without a hash or event.
