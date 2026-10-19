# 08 · Image checks

Pick signals that are reproducible and explainable. Pixel checks run on a downscaled analysis copy (long side `image_analysis_max_side`). The original is never touched, and findings record the resolution used.

First, guard memory (skill 19): set `Image.MAX_IMAGE_PIXELS = limits["image_max_pixels"]`, open lazily, and check `im.size` **before** `.convert()`. A 3 MB JPEG can decode to hundreds of MB.

## Metadata signals (EXIF fields only, never filesystem dates)
| Finding id | Check | Weight |
|---|---|---|
| `IMG-EXIF-MISSING` | No EXIF at all | 1 |
| `IMG-SOFTWARE-TAG` | `IFD0:Software` names an editing tool | 2 |
| `IMG-DATE-GAP` | `ExifIFD:DateTimeOriginal` and `IFD0:ModifyDate` differ (record the gap) | 1 |
| `IMG-DIM-MISMATCH` | `File:ImageWidth/Height` differ from `ExifIFD:ExifImageWidth/Height` | 2 |
| `IMG-GPS` | GPS present or absent, recorded only | 0 |

EXIF date strings look like `2024:03:01 14:22:10`. If a value won't parse, report `not_available`, don't guess.

## Pixel signal: ELA, JPEG only, informational
Error level analysis is meaningful only on JPEGs. For PNG, emit `status: "not_available"` with the reason "ELA applies to JPEG only". ELA has no baseline here, so it's **informational: weight 0, never feeds priority**. Report the numbers and let a human interpret them.

```python
import io, numpy as np
from PIL import Image, ImageChops

def ela_stats(path, quality=90, max_side=1280):
    im = Image.open(path)
    if im.format != "JPEG":
        return None                                   # caller emits not_available
    im = im.convert("RGB"); im.thumbnail((max_side, max_side))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=quality); buf.seek(0)
    diff = ImageChops.difference(im, Image.open(buf).convert("RGB")).convert("L")
    a = np.asarray(diff, dtype=np.float32)
    return {"mean": float(a.mean()), "p99": float(np.percentile(a, 99)),
            "frac_above_20": float((a > 20).mean()), "quality": quality, "max_side": max_side}
```

Never write "this region was edited". Recompression, resizing and screenshots all change ELA output.

Done when: each check emits a finding in the skill 10 format with benign explanations, a PNG gets `not_available` for ELA, and a decompression-bomb image is rejected, not decoded.
