# 09 · Video checks

ffmpeg's `fps` filter still decodes every frame, and the free worker has about a tenth of a core. So **duration and resolution caps are the real CPU control** (skill 19). Check them right after ffprobe, before any ffmpeg run, and record decode time in the Day-1 smoke test.

```python
p = ffprobe(path)
dur = get_duration(p)
if dur is None:            raise Rejected("unreadable_duration")
if dur > L["video_max_seconds"]:   raise Rejected("video_max_seconds", L["video_max_seconds"], round(dur))
v = next(s for s in p["streams"] if s["codec_type"] == "video")
if v["width"] > L["video_max_width"] or v["height"] > L["video_max_height"]:
    raise Rejected("video_max_resolution", f'{L["video_max_width"]}x{L["video_max_height"]}',
                   f'{v["width"]}x{v["height"]}')
```

## Sampling
```python
import os, subprocess

def sample_frames(path, outdir, dur):
    n = L["frame_max_count"]
    fps = min(1.0, n / max(dur, 1.0))
    os.makedirs(outdir, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-i", path,
                    "-vf", f"fps={fps},scale={L['frame_width']}:-2",
                    "-frames:v", str(n), "-q:v", "4", f"{outdir}/%04d.jpg"],
                   check=True, timeout=L["ffmpeg_timeout_s"])
    return fps          # frame k (0-based) is at about k/fps seconds
```
Process frames one at a time or in small batches, never all in memory. No transcoding. Record sampling interval and frame timestamps so a human can check.

## Signals
```python
import cv2, numpy as np

def dhash(img, n=8):
    g = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (n + 1, n))
    return (g[:, 1:] > g[:, :-1]).flatten()

def ham(a, b): return int((a != b).sum())
```

**Repeated or looped segments (weight 2).** A duplicated segment with moving content repeats frames at a distance, not next to each other, so compare **all pairs**. 30 frames is only 435 comparisons. Require that the content changed in between, so a static scene doesn't match itself.

```python
def repeated_segments(hashes, fps, min_gap=3, max_ham=2, min_change=10, top=5):
    out = []
    for i in range(len(hashes)):
        for j in range(i + min_gap, len(hashes)):
            if ham(hashes[i], hashes[j]) <= max_ham:
                changed = max(ham(hashes[i], hashes[k]) for k in range(i + 1, j))
                if changed >= min_change:
                    out.append({"frames": [i + 1, j + 1], "hamming": ham(hashes[i], hashes[j]),
                                "t_seconds": [round(i / fps, 1), round(j / fps, 1)]})
    return sorted(out, key=lambda x: (x["hamming"], -(x["frames"][1] - x["frames"][0])))[:top]
```

**Frozen consecutive frames (weight 1).** Consecutive near-identical frames, flagged only if the video has motion elsewhere (median frame-to-frame mean absolute difference at or above about 2.0). Otherwise a static CCTV scene would flag everywhere.

**Continuity jump (weight 1).** A consecutive-pair mean absolute difference far above the video's own mean (for example, mean plus 3 standard deviations).

**Container signals (weight 1).** Missing or odd creation time, from ffprobe tags.

Keep thresholds in `worker/forensics/thresholds.py`, documented as starting guesses. Every video finding carries a caveat: static scenes legitimately repeat, and scene cuts legitimately jump.

Done when: a clip built from a segment played twice (skill 14 recipe) flags the repeated pair, a plain static clip produces no repeat finding, an over-length or over-resolution clip is rejected before ffmpeg runs, and a file with no duration is rejected cleanly instead of raising `KeyError`.
