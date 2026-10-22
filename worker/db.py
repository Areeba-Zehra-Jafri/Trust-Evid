"""All worker persistence uses the server-side Supabase service role."""
from datetime import datetime, timezone
import os, json, logging
from supabase import Client, create_client
from config import supabase_service_key, supabase_url

BUCKET = "evidence-originals"
log = logging.getLogger(__name__)

def get_admin_client() -> Client: return create_client(supabase_url(), supabase_service_key())
def get_evidence(client: Client, evidence_id: str):
    return client.table("evidence").select("id,case_id,owner_user_id,storage_path,media_type,file_size,sha256_original,processing_status").eq("id", evidence_id).maybe_single().execute().data

def claim_evidence(client: Client, evidence_id: str) -> bool:
    result = client.table("evidence").update({"processing_status":"processing", "processing_started_at":datetime.now(timezone.utc).isoformat(), "error":None}).eq("id", evidence_id).in_("processing_status", ["uploaded", "awaiting_upload"]).execute()
    return bool(result.data)
def set_failed(client: Client, evidence_id: str, message: str):
    client.table("evidence").update({"processing_status":"failed", "error":{"code":"processing_failed","message":message[:200]}}).eq("id", evidence_id).eq("processing_status", "processing").execute()
def persist_result(client: Client, row: dict, result: dict):
    client.table("processing_findings").upsert({"evidence_id":row["id"],"case_id":row["case_id"],"processor_version":result["processor_version"],"metadata":result["metadata"],"signals":result["signals"],"sampled_frames":result["sampled_frames"],"limitations":result["limitations"]}, on_conflict="evidence_id").execute()
    return client.table("evidence").update({"extracted_metadata":result["metadata"],"processing_status":"ready","processed_at":datetime.now(timezone.utc).isoformat()}).eq("id",row["id"]).eq("processing_status","processing").execute()
def record_processing_custody(client: Client, row: dict, digest: str):
    try:
        return client.rpc("record_custody_event", {"p_case_id":row["case_id"],"p_evidence_id":row["id"],"p_actor_user_id":row.get("owner_user_id"),"p_event_type":"analysis","p_hash":digest,"p_details":{"source":"worker"}}).execute()
    except Exception as exc:
        log.exception("custody analysis event failed for evidence %s: %s", row["id"], exc)
        return None

def persist_ai(client: Client, row: dict, parsed: dict | None, error: str | None, raw_response: str | None = None):
    raw_value = None
    if raw_response is not None:
        try: raw_value = json.loads(raw_response)
        except (TypeError, json.JSONDecodeError): raw_value = {"text":str(raw_response)[:250000]}
    payload = {"evidence_id":row["id"],"case_id":row["case_id"],"user_id":row.get("owner_user_id"),"status":"complete" if parsed else "incomplete","ai_model":os.environ.get("AI_MODEL"),"prompt_version":"ai-grounded-v1","parsed_result":parsed,"raw_response":raw_value,"ai_priority":parsed.get("review_priority") if parsed else None,"error_message":error}
    existing = client.table("ai_analyses").select("id").eq("evidence_id",row["id"]).order("created_at", desc=True).limit(1).execute().data
    return client.table("ai_analyses").update(payload).eq("id",existing[0]["id"]).execute() if existing else client.table("ai_analyses").insert(payload).execute()
