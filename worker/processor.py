"""Deterministic, bounded media inspection. No authenticity conclusions are made."""
import hashlib, json, mimetypes, os, subprocess, tempfile
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from PIL import Image

VERSION = "deterministic-1"

def _download(url, max_bytes):
    req = Request(url, headers={"User-Agent": "trust-evid-worker/1"})
    with urlopen(req, timeout=30) as response:
        data = response.read(max_bytes + 1)
    if len(data) > max_bytes: raise ValueError("download exceeds configured limit")
    return data

def inspect_media(data, media_type, limits):
    digest = hashlib.sha256(data).hexdigest()
    metadata = {"byte_size": len(data), "sha256": digest, "media_type": media_type}
    signals, frames, limitations = [], [], []
    is_image = media_type.startswith("image/")
    is_video = media_type.startswith("video/")
    if is_image:
        try:
            with Image.open(__import__('io').BytesIO(data)) as im:
                metadata.update({"format": im.format, "width": im.width, "height": im.height, "mode": im.mode})
                metadata["exif_keys"] = sorted((im.getexif() or {}).keys())[:50]
                if im.format not in ("JPEG", "PNG", "WEBP", "GIF"):
                    signals.append({"code":"unsupported_image_format","severity":"info"})
        except Exception as exc: limitations.append("Image metadata could not be decoded: " + str(exc)[:120])
    elif is_video:
        with tempfile.NamedTemporaryFile(suffix=".media") as f:
            f.write(data); f.flush()
            try:
                cmd=["ffprobe","-v","error","-print_format","json","-show_format","-show_streams",f.name]
                result=subprocess.run(cmd,capture_output=True,text=True,timeout=limits.get("ffprobe_timeout_seconds",20))
                if result.returncode == 0:
                    probe=json.loads(result.stdout); metadata["ffprobe"]=probe
                    streams=probe.get("streams",[]); video=next((s for s in streams if s.get("codec_type")=="video"),None)
                    if video: metadata.update({"width":video.get("width"),"height":video.get("height"),"codec":video.get("codec_name"),"duration":video.get("duration")})
                    frames=[{"sample_index":i,"method":"ffprobe stream-level sample"} for i in range(min(int(limits.get("max_sampled_frames",5)),3))]
                else: limitations.append("ffprobe returned no usable stream data")
            except Exception as exc: limitations.append("Video inspection failed: " + str(exc)[:120])
    else: limitations.append("Media type is not image or video; only hash and size were recorded")
    return {"processor_version":VERSION,"metadata":metadata,"signals":signals,"sampled_frames":frames,"limitations":limitations,"processed_at":datetime.now(timezone.utc).isoformat()}

def process_payload(payload, limits):
    data=_download(payload["signed_url"], int(limits.get("max_file_size",50*1024*1024)))
    return inspect_media(data, payload.get("media_type","application/octet-stream"), limits)
