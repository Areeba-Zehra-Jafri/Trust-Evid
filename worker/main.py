import hmac, json, threading, uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from config import load_limits, worker_secret
from db import get_admin_client, get_evidence, claim_evidence, set_failed, persist_result, persist_ai, write_hash_once
from processor import process_stored_evidence, verify_stored_original
from ai_analysis import analyze, AIError, AIProviderError

app = FastAPI(title="Trust-EVID evidence worker")
active = 0
lock = threading.Lock()

def ensure_original_hash(recorded: str | None, computed: str) -> None:
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
    value = payload["evidence_id"].strip()
    try: uuid.UUID(value)
    except ValueError: raise HTTPException(422, "evidence_id must be a UUID")
    return value

@app.get("/health")
def health(): return {"ok": True, "active_tasks": active}

@app.post("/verify")
async def verify_original(request: Request):
    verify(request)
    evidence_id = strict_id(await request.json())
    try:
        client = get_admin_client()
        row = get_evidence(client, evidence_id)
        if not row: raise HTTPException(404, "Evidence not found")
        digest, byte_count = verify_stored_original(client, row, load_limits())
        ensure_original_hash(row.get("sha256_original"), digest)
        # Verification is read-only. Finalization is the single authoritative
        # persistence path, so a worker retry cannot race a browser finalization.
        return {"sha256": digest, "byte_count": byte_count}
    except HTTPException: raise
    except ValueError as exc:
        if str(exc) == "original_hash_mismatch": raise HTTPException(409, "Stored hash does not match original bytes")
        raise HTTPException(422, "Original verification failed")
    except Exception: raise HTTPException(503, "Original storage is unavailable")

@app.post("/process")
async def process(request: Request):
    global active
    verify(request)
    try:
        evidence_id = strict_id(await request.json()); client = get_admin_client(); row = get_evidence(client, evidence_id)
        if not row: raise HTTPException(404, "Evidence not found")
        if row.get("processing_status") in ("ready", "done"): return JSONResponse({"accepted": True, "status": "already_complete"}, 202)
        if not claim_evidence(client, evidence_id): return JSONResponse({"accepted": True, "status": "already_claimed"}, 202)
        with lock:
            if active >= int(load_limits().get("max_concurrent_tasks", 1)):
                set_failed(client, evidence_id, "worker_at_capacity"); raise HTTPException(429, "Worker is at capacity")
            active += 1
        try:
            result = process_stored_evidence(client, row, load_limits()); computed_hash = result["metadata"]["sha256"]
            ensure_original_hash(row.get("sha256_original"), computed_hash); write_hash_once(client, evidence_id, computed_hash); persist_result(client, row, result)
            try:
                ai_result, raw_response = analyze(result.get("sampled_frames", []), [{"id": "deterministic-metadata", "type": "metadata", "value": result["metadata"]}])
                persist_ai(client, row, ai_result, None, raw_response=raw_response)
            except (AIError, AIProviderError, ValueError, KeyError, TypeError) as ai_exc:
                try: persist_ai(client, row, None, str(ai_exc)[:200])
                except Exception: pass
            return JSONResponse({"accepted": True}, 202)
        except Exception as exc:
            set_failed(client, evidence_id, str(exc)); raise HTTPException(400, "Evidence processing failed")
        finally:
            with lock: active -= 1
    except HTTPException: raise
    except Exception: raise HTTPException(503, "Worker storage is unavailable")
