# 19 · Limits and rejection

All caps live in `worker/limits.json`. The worker reads it, and the web app imports it (`import limits from '../worker/limits.json'` with `resolveJsonModule`; Vercel's root directory is the repo root, so check the import works in your setup). **Never hardcode these numbers anywhere else.**

Why these and not just bytes: the worker streams to disk, so file size barely affects RAM. What exhausts 512 MB and 0.1 CPU is pixels (a 3 MB JPEG can decode to hundreds of MB), duration, resolution and frame count.

The numbers are starting guesses. Tune them after the Day-1 smoke test, lowering video caps first, and record what you chose in `CONTEXT.md`.

## Where each limit is enforced
| Limit | Where |
|---|---|
| `image_max_bytes`, `video_max_bytes` | API (declared size), bucket, worker stream cap then per-type cap |
| `image_max_pixels` | Worker: `Image.MAX_IMAGE_PIXELS`, and check `im.size` before `.convert()` |
| `image_analysis_max_side` | Skill 08: downscale and the recorded `max_side` |
| `video_max_seconds`, `video_max_width`, `video_max_height` | Worker, right after ffprobe, before any ffmpeg run |
| `frame_max_count`, `frame_width`, `ffmpeg_timeout_s` | Skill 09 sampling |
| `ai_max_images`, `ai_timeout_s` | Skill 11 |
| `job_timeout_s` | Skill 05 deadline. Keep the worst case well under 15 minutes. |

## Enforce in layers
1. **Browser:** pre-check size and type for friendlier errors. Untrusted, UX only.
2. **API:** declared type and size against the allow-list and caps.
3. **Bucket:** hard `file_size_limit` and `allowed_mime_types` in a migration.
4. **Worker:** count bytes while streaming, then check pixels, duration and resolution from headers (Pillow `size`, ffprobe) before decoding anything.

The type isn't confirmed until the magic-byte check, so stream with the larger cap, then apply the per-type cap.

## Rejection codes
Store a short code with values in `evidence.error`, so the UI can say exactly what was exceeded:

```json
{"limit": "video_max_seconds", "max": 60, "actual": 74}
```

Codes: `stream_max_bytes`, `image_max_bytes`, `video_max_bytes`, `image_max_pixels`, `video_max_seconds`, `video_max_resolution`, `unreadable_duration`, `unsupported_type`, `type_mismatch`. The UI maps each to a plain sentence (skill 01). A rejected file stays in the write-once bucket. State that in the README.

## Keeping the bucket in sync
SQL can't read the JSON. In the bucket migration add the comment `-- keep in sync with worker/limits.json`, and add a tiny CI script:

```python
# scripts/check_limits.py
import json, pathlib
lim = json.load(open("worker/limits.json"))
sql = pathlib.Path("supabase/migrations/002_buckets.sql").read_text()
assert str(max(lim["image_max_bytes"], lim["video_max_bytes"])) in sql, "bucket limit out of sync"
```

Generate the upload form's hint text ("images up to 10 MB, videos up to 60 s") from the same JSON.

Done when: changing one number in `limits.json` changes behavior everywhere, the CI check fails if the bucket drifts, and each rejection test in skill 14 passes.
