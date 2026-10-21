import hmac, json, threading
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from config import load_limits, worker_secret
from db import get_admin_client, get_evidence, claim_evidence, set_failed, persist_result, persist_ai, write_hash_once
from processor import process_stored_evidence
from ai_analysis import analyze, AIError, AIProviderError

app = FastAPI(title="Trust-Evid evidence worker")
active = 0
lock = threading.Lock()

def ensure_original_hash(recorded: str | None, computed: str) -> None:
    """Hashes are write-once; a stored value may never be silently replaced."""
    if recorded and recorded.lower() != computed.lower():
        raise ValueError("original_hash_mismatch")

def verify(request: Request):
    supplied = request.headers.get("X-Worker-Secret")
    expected = worker_secret()
    if not expected or not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(401, "Invalid or missing worker secret")

def strict_id(payload):
    if not isinstance(payload, dict) or set(payload) != {"evidence_id"} or not isinstance(payload["evidence_id"], str) or not payload["evidence_id"].strip():
        raise HTTPException(422, "Body must contain only evidence_id")
    return payload["evidence_id"].strip()

@app.get("/health")
def health():
    return {"ok": True, "active_tasks": active}

@app.post("/process")
async def process(request: Request):
    global active
    verify(request)
    try:
        evidence_id = strict_id(await request.json())
        client = get_admin_client()
        row = get_evidence(client, evidence_id)
        if not row:
            raise HTTPException(404, "Evidence not found")
        if row.get("processing_status") in ("ready", "done"):
            return JSONResponse({"accepted": True, "status": "already_complete"}, 202)
        if not claim_evidence(client, evidence_id):
            return JSONResponse({"accepted": True, "status": "already_claimed"}, 202)
        with lock:
            if active >= int(load_limits().get("max_concurrent_tasks", 1)):
                set_failed(client, evidence_id, "worker_at_capacity")
                raise HTTPException(429, "Worker is at capacity")
            active += 1
        try:
            result = process_stored_evidence(client, row, load_limits())
            computed_hash = result["metadata"]["sha256"]
            ensure_original_hash(row.get("sha256_original"), computed_hash)
            write_hash_once(client, evidence_id, computed_hash)
            persist_result(client, row, result)
            # Optional and strictly additive: AI failure never invalidates deterministic output.
            try:
                ai_result, raw_response = analyze(result.get("sampled_frames", []), [
                    {"id": "deterministic-metadata", "type": "metadata", "value": result["metadata"]}
                ])
                # Keep raw provider output auditable, but only persist the validated
                # structure as parsed_result. Neither replaces deterministic output.
                persist_ai(client, row, ai_result, None, raw_response=raw_response)
            except (AIError, AIProviderError, ValueError, KeyError, TypeError) as ai_exc:
                try:
                    persist_ai(client, row, None, str(ai_exc)[:200])
                except Exception:
                    # AI persistence is optional; deterministic completion remains authoritative.
                    pass
            # Keep the transport response deliberately small; deterministic status is
            # persisted in Supabase and callers must not infer AI completion from it.
            return JSONResponse({"accepted": True}, 202)
        except Exception as exc:
            set_failed(client, evidence_id, str(exc))
            raise HTTPException(400, "Evidence processing failed")
        finally:
            with lock: active -= 1
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Worker storage is unavailable")
