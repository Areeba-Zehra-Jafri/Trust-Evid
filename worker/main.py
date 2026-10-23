import hmac, uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from config import load_limits, worker_secret
from db import get_admin_client, get_evidence, claim_evidence, set_failed, persist_result, persist_ai, record_processing_custody
from processor import process_stored_evidence
from ai_analysis import analyze
app = FastAPI(title="Trust-EVID evidence worker")

def verify(request):
    supplied = request.headers.get("X-Worker-Secret"); expected = worker_secret()
    if not expected or not supplied or not hmac.compare_digest(supplied, expected): raise HTTPException(401, "Invalid or missing worker secret")

def strict_id(payload):
    if not isinstance(payload, dict) or set(payload) != {"evidence_id"} or not isinstance(payload["evidence_id"], str): raise HTTPException(422, "Body must contain only evidence_id")
    try: uuid.UUID(payload["evidence_id"])
    except (ValueError, AttributeError): raise HTTPException(422, "evidence_id must be a UUID")
    return payload["evidence_id"]

@app.get("/health")
def health(): return {"ok": True, "status": "alive"}

@app.post("/process")
async def process(request: Request):
    verify(request); evidence_id = strict_id(await request.json()); client = get_admin_client(); row = get_evidence(client, evidence_id)
    if not row: raise HTTPException(404, "Evidence not found")
    if row.get("processing_status") == "ready": return JSONResponse({"accepted": True, "status": "already_complete"}, 202)
    if not claim_evidence(client, evidence_id): return JSONResponse({"accepted": True, "status": "already_claimed"}, 202)
    try:
        result = process_stored_evidence(client, row, load_limits())
        digest = result["metadata"]["sha256"]
        if row.get("sha256_original") and not hmac.compare_digest(row["sha256_original"].lower(), digest.lower()): raise ValueError("original_hash_mismatch")
        # Deterministic completion remains authoritative; AI is additive and
        # never changes the evidence processing status.
        persist_result(client, row, result); record_processing_custody(client, row, digest)
        return JSONResponse({"accepted": True, "status": "ready"}, 202)
    except Exception as exc:
        # Always leave a claimed row terminal, and keep the detailed cause in
        # the database/logs without exposing storage or credentials to callers.
        import logging
        logging.getLogger(__name__).exception("processing failed evidence_id=%s", evidence_id)
        try: set_failed(client, evidence_id, str(exc))
        except Exception: logging.getLogger(__name__).exception("failed to persist terminal failure evidence_id=%s", evidence_id)
        code = getattr(exc, "code", "processing_failed")
        raise HTTPException(400, f"Evidence processing failed ({code})")

@app.post("/triage")
async def triage(request: Request):
    verify(request); evidence_id = strict_id(await request.json()); client = get_admin_client(); row = get_evidence(client, evidence_id)
    if not row: raise HTTPException(404, "Evidence not found")
    if row.get("processing_status") != "ready": raise HTTPException(409, "Evidence is not ready")
    try:
        finding = client.table("processing_findings").select("metadata,signals,sampled_frames,limitations").eq("evidence_id", evidence_id).order("created_at", desc=True).limit(1).execute().data[0]
        parsed, raw = analyze([], [{"id":"deterministic-metadata", "type":"metadata", "value":finding}]); persist_ai(client, row, parsed, None, raw_response=raw)
        return {"status":"complete"}
    except Exception as exc:
        try: persist_ai(client, row, None, str(exc)[:200])
        except Exception: pass
        return {"status":"incomplete"}
