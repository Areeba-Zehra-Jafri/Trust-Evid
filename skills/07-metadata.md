# 07 · Metadata extraction

Shell out. It's simpler and lighter than wrapper libraries. Always set timeouts.

## ExifTool
Use `-G1` so keys carry their group, then drop what describes the **worker's temp download**, not the evidence.

```python
import json, subprocess

def exiftool(path):
    out = subprocess.run(["exiftool", "-json", "-n", "-G1", path],
                         capture_output=True, text=True, timeout=30, check=True).stdout
    raw = json.loads(out)[0]
    drop = lambda k: k == "SourceFile" or k.startswith(("System:", "ExifTool:"))
    return {k: v for k, v in raw.items() if not drop(k)}
```

Why: `System:FileModifyDate`, `System:FileAccessDate`, `System:Directory` and `SourceFile` all describe the temp file on the worker. Using them would produce false "dates differ" findings and leak a path. Skill 08's date comparisons use EXIF fields only (`ExifIFD:DateTimeOriginal`, `IFD0:ModifyDate`).

## ffprobe
```python
def ffprobe(path):
    out = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json",
                          "-show_format", "-show_streams", path],
                         capture_output=True, text=True, timeout=30, check=True).stdout
    p = json.loads(out)
    p.get("format", {}).pop("filename", None)       # temp path
    return p

def get_duration(p):
    """format.duration can be missing. Fall back to the video stream, else None."""
    d = p.get("format", {}).get("duration")
    if d is None:
        for s in p.get("streams", []):
            if s.get("codec_type") == "video" and s.get("duration"):
                d = s["duration"]; break
    return float(d) if d is not None else None
```

## Storing and sharing
- Store the cleaned output in `evidence.extracted_metadata`.
- Before anything goes to the AI, strip identifying fields: any key containing `GPS`, `Location`, `SerialNumber`, `Owner`, `Artist`, `Copyright`, or `Author` (case-insensitive), plus ffprobe's `tags` entries with location data.

```python
import re
IDENT = re.compile(r"gps|location|serial|owner|artist|copyright|author|iso6709", re.I)
def strip_identifying(meta: dict) -> dict:
    return {k: v for k, v in meta.items() if not IDENT.search(k)}
```

Done when: an image with EXIF and a short MP4 both store metadata, no stored key starts with `System:` and no temp path appears anywhere, and a file with no EXIF stores an empty result without crashing.
