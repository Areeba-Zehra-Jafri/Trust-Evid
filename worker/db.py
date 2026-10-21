"""All worker persistence uses the server-side Supabase service role."""
from datetime import datetime, timezone
from supabase import Client, create_client
from config import supabase_service_key, supabase_url

BUCKET = "evidence-originals"

def get_admin_client() -> Client:
    return create_client(supabase_url(), supabase_service_key())

def get_evidence(client: Client, evidence_id: str):
    return client.table("evidence").select("id,case_id,storage_path,media_type,file_size,sha256_original,processing_status").eq("id", evidence_id).maybe_single().execute().data

def claim_evidence(client: Client, evidence_id: str) -> bool:
    result = client.table("evidence").update({"processing_status":"processing", "processing_started_at":datetime.now(timezone.utc).isoformat(), "error":None}).eq("id", evidence_id).in_("processing_status", ["uploaded", "awaiting_upload"]).execute()
    return bool(result.data)

def set_failed(client: Client, evidence_id: str, message: str):
    client.table("evidence").update({"processing_status":"failed", "error":{"code":"processing_failed","message":message[:200]}}).eq("id", evidence_id).eq("processing_status", "processing").execute()

def write_hash_once(client: Client, evidence_id: str, digest: str):
    return client.table("evidence").update({"sha256_original":digest}).eq("id", evidence_id).is_("sha256_original", "null").execute()

def persist_result(client: Client, row: dict, result: dict):
    client.table("processing_findings").upsert({"evidence_id":row["id"],"case_id":row["case_id"],"processor_version":result["processor_version"],"metadata":result["metadata"],"signals":result["signals"],"sampled_frames":result["sampled_frames"],"limitations":result["limitations"]}, on_conflict="evidence_id").execute()
    return client.table("evidence").update({"extracted_metadata":result["metadata"],"processing_status":"ready","processed_at":datetime.now(timezone.utc).isoformat()}).eq("id",row["id"]).eq("processing_status","processing").execute()

def persist_ai(client: Client, row: dict, parsed: dict | None, error: str | None):
    """AI is additive: deterministic findings already exist and remain authoritative."""
    payload = {"evidence_id": row["id"], "case_id": row["case_id"],
               "status": "complete" if parsed else "incomplete",
               "parsed_result": parsed, "error_message": error}
    return client.table("ai_analyses").upsert(payload, on_conflict="evidence_id").execute()
