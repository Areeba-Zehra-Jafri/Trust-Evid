"""Bounded retrieval and deterministic media inspection."""
import hashlib, json, os, subprocess, tempfile, math
from PIL import Image
from db import BUCKET
VERSION = "deterministic-4"

# EXIF tag IDs defined by the TIFF/EXIF standards. Values are never persisted
# for privacy; only the presence of sensitive fields is reported.
GPS_TAGS = {34853}
PERSONAL_EXIF_TAGS = {315, 33432, 40091, 40092, 40093, 40094, 40095}

class Rejected(ValueError):
    def __init__(self, code, **values):
        super().__init__(code); self.code, self.values = code, values

def _stream_original(client, path, limits):
    signed = client.storage.from_(BUCKET).create_signed_url(path, 300)
    url = signed.get("signedURL") or signed.get("signed_url")
    if not url: raise Rejected("storage_url_unavailable")
    total, digest = 0, hashlib.sha256()
    target = tempfile.NamedTemporaryFile(suffix=".media", delete=False)
    try:
        with target as out:
            from urllib.request import Request, urlopen
            with urlopen(Request(url), timeout=30) as response:
                while chunk := response.read(1024 * 1024):
                    total += len(chunk)
                    if total > int(limits["max_file_size"]): raise Rejected("stream_max_bytes")
                    digest.update(chunk); out.write(chunk)
        return target.name, digest.hexdigest(), total
    except Exception:
        try: os.unlink(target.name)
        except OSError: pass
        raise

def verify_stored_original(client, row, limits):
    path, digest, size = _stream_original(client, row["storage_path"], limits)
    try:
        if size != int(row.get("file_size")): raise Rejected("recorded_size_mismatch")
        media = row.get("media_type", "")
        limit = limits.get("image_max_bytes") if media.startswith("image/") else limits.get("video_max_bytes")
        if limit and size > int(limit): raise Rejected(f"{media.split('/')[0]}_max_bytes")
        return digest, size
    finally:
        try: os.unlink(path)
        except OSError: pass

def _video_details(path, limits):
    probe = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path], capture_output=True, text=True, timeout=int(limits["ffprobe_timeout_seconds"]))
    if probe.returncode: raise Rejected("unsupported_type")
    data = json.loads(probe.stdout); streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    duration = float(data.get("format", {}).get("duration", 0) or 0)
    if duration > int(limits["video_max_seconds"]): raise Rejected("video_max_seconds")
    if int(video.get("width", 0) or 0) > int(limits["video_max_width"]) or int(video.get("height", 0) or 0) > int(limits["video_max_height"]): raise Rejected("video_dimensions")
    return {"container": data.get("format", {}).get("format_name"), "codec": video.get("codec_name"), "duration_seconds": duration, "timestamps_present": bool(video.get("start_time") or video.get("duration")), "stream_count": len(streams)}

def process_stored_evidence(client, row, limits):
    path, digest, size = _stream_original(client, row["storage_path"], limits)
    try:
        media, signals = row.get("media_type", ""), []
        details = {"media_type": media, "byte_size": size, "sha256": digest}
        if media.startswith("image/"):
            with Image.open(path) as image:
                pixels = image.width * image.height
                if pixels > int(limits["image_max_pixels"]): raise Rejected("image_max_pixels", actual=pixels)
                exif = image.getexif(); fields = {str(k): ("present" if int(k) in GPS_TAGS | PERSONAL_EXIF_TAGS else str(v)[:200]) for k, v in exif.items() if str(k).isdigit()}
                details.update({"format": image.format, "width": image.width, "height": image.height, "exif_present": bool(exif), "exif_fields": fields})
                if not exif: signals.append({"check": "exif", "result": "flag", "details": "metadata_missing"})
                signals.append({"check": "recompression", "result": "not_run", "details": {"format": image.format, "reason": "No recompression comparison was performed."}})
                for key, value in fields.items():
                    try:
                        tag_id = int(key)
                    except ValueError:
                        tag_id = -1
                    label = "gps" if tag_id in GPS_TAGS or key == "GPSInfo" else "personal_exif" if tag_id in PERSONAL_EXIF_TAGS else None
                    if label: signals.append({"check": label, "result": "flag", "details": {"field": key, "value_present": bool(value)}})
        elif media.startswith("video/"):
            details["ffprobe"] = _video_details(path, limits)
            duration = details["ffprobe"]["duration_seconds"]
            count = max(1, min(int(limits.get("frame_max_count", 5)), int(limits.get("max_sampled_frames", 5))))
            # Fixed, bounded intervals avoid an end-frame seek failure and make
            # repeated-frame detection reproducible across worker runs.
            interval = duration / count if duration > 0 else 0
            points = [min(interval * (i + 0.5), max(duration - 0.001, 0)) for i in range(count)]
            frames, fingerprints = [], []
            for point in points:
                out = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False); out.close()
                try:
                    subprocess.run(["ffmpeg", "-y", "-ss", f"{point:.3f}", "-i", path, "-frames:v", "1", "-vf", "scale=640:-1", out.name], capture_output=True, timeout=int(limits["ffmpeg_timeout_s"]), check=True)
                    data = open(out.name, "rb").read(); fingerprint = hashlib.sha256(data).hexdigest()
                    frames.append({"timestamp_seconds": round(point, 3), "sha256": fingerprint}); fingerprints.append(fingerprint)
                finally:
                    try: os.unlink(out.name)
                    except OSError: pass
            repeated = len(set(fingerprints)) < len(fingerprints)
            signals.append({"check": "sampled_frames", "result": "flag" if repeated else "observed", "details": {"count": len(frames), "repeated_frame": repeated}})
        else: raise Rejected("unsupported_type")
        return {"processor_version": VERSION, "metadata": details, "signals": signals, "sampled_frames": frames if media.startswith("video/") else [], "limitations": ["Deterministic inspection does not establish authenticity or admissibility.", "Recompression comparison was not run." if media.startswith("image/") else "Video sampling is bounded and may miss events."]}
    finally:
        try: os.unlink(path)
        except OSError: pass
