"""Bounded streaming retrieval and deterministic inspection."""
import hashlib, json, subprocess, tempfile
from PIL import Image
from db import BUCKET

VERSION = "deterministic-2"

class Rejected(ValueError):
    def __init__(self, code, **values):
        super().__init__(code)
        self.code, self.values = code, values

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
                    if total > int(limits["max_file_size"]): raise Rejected("stream_max_bytes", max=int(limits["max_file_size"]))
                    digest.update(chunk); out.write(chunk)
        return target.name, digest.hexdigest(), total
    except Exception:
        import os
        try: os.unlink(target.name)
        except OSError: pass
        raise

def _image(path, row, limits):
    Image.MAX_IMAGE_PIXELS = int(limits["image_max_pixels"])
    with Image.open(path) as image:
        width, height = image.size
        pixels = width * height
        if pixels > int(limits["image_max_pixels"]): raise Rejected("image_max_pixels", max=int(limits["image_max_pixels"]), actual=pixels)
        if image.format not in ("JPEG", "PNG"): raise Rejected("type_mismatch")
        return {"format": image.format, "width": width, "height": height, "exif_present": bool(image.getexif())}

def _video(path, limits):
    try:
        probe = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path], capture_output=True, text=True, timeout=int(limits["ffprobe_timeout_seconds"]))
    except subprocess.TimeoutExpired: raise Rejected("ffprobe_timeout")
    if probe.returncode: raise Rejected("unsupported_type")
    data = json.loads(probe.stdout); fmt = data.get("format", {})
    try: duration = float(fmt["duration"])
    except (KeyError, TypeError, ValueError): raise Rejected("unreadable_duration")
    if duration > float(limits["video_max_seconds"]): raise Rejected("video_max_seconds", max=limits["video_max_seconds"], actual=duration)
    stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    if not stream: raise Rejected("unsupported_type")
    if stream.get("width", 0) > limits["video_max_width"] or stream.get("height", 0) > limits["video_max_height"]: raise Rejected("video_max_resolution")
    return {"duration_seconds": duration, "width": stream.get("width"), "height": stream.get("height"), "ffprobe": data}

def process_stored_evidence(client, row, limits):
    path, digest, size = _stream_original(client, row["storage_path"], limits)
    try:
        media = row.get("media_type", "")
        cap = limits["image_max_bytes"] if media.startswith("image/") else limits["video_max_bytes"]
        if size > int(cap): raise Rejected("image_max_bytes" if media.startswith("image/") else "video_max_bytes", max=cap, actual=size)
        if media.startswith("image/"): details = _image(path, row, limits)
        elif media.startswith("video/"): details = _video(path, limits)
        else: raise Rejected("unsupported_type")
        metadata = {"byte_size": size, "sha256": digest, "media_type": media, **details}
        return {"processor_version": VERSION, "metadata": metadata, "signals": [], "sampled_frames": [], "limitations": ["Deterministic inspection does not establish authenticity or admissibility."]}
    finally:
        import os
        try: os.unlink(path)
        except OSError: pass
