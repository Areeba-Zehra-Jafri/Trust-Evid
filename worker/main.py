import os, hmac, json, threading
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.request import Request as UrlRequest, urlopen
from processor import process_payload
from ai_analysis import analyze, MODEL, PROMPT_VERSION, AIError

app=FastAPI(title="Trust-Evid deterministic worker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
try:
    with open("limits.json") as f: limits=json.load(f)
except Exception: limits={}
WORKER_SECRET=os.getenv("WORKER_SHARED_SECRET")
active=0; lock=threading.Lock()
def verify(request):
    supplied=request.headers.get("X-Worker-Secret")
    if not WORKER_SECRET or not supplied or not hmac.compare_digest(supplied,WORKER_SECRET): raise HTTPException(401,"Invalid or missing worker secret")
def persist(payload, result):
    base=payload.get("supabase_url"); token=payload.get("access_token")
    if not base or not token: raise ValueError("supabase_url and access_token are required")
    evidence_id=payload["evidence_id"]; case_id=payload["case_id"]
    body=json.dumps({"evidence_id":evidence_id,"case_id":case_id,"processor_version":result["processor_version"],"metadata":result["metadata"],"signals":result["signals"],"sampled_frames":result["sampled_frames"],"limitations":result["limitations"]}).encode()
    req=UrlRequest(base.rstrip("/")+"/rest/v1/processing_findings",body=body,method="POST",headers={"apikey":token,"Authorization":"Bearer "+token,"Content-Type":"application/json","Prefer":"return=minimal"})
    with urlopen(req,timeout=20): pass
    update=json.dumps({"extracted_metadata":result["metadata"],"processing_status":"processed","processed_at":result["processed_at"]}).encode()
    req=UrlRequest(base.rstrip("/")+f"/rest/v1/evidence?id=eq.{evidence_id}",body=update,method="PATCH",headers={"apikey":token,"Authorization":"Bearer "+token,"Content-Type":"application/json"})
    with urlopen(req,timeout=20): pass
@app.get("/health")
def health(): return {"ok":True,"active_tasks":active}
@app.post("/analyze")
async def analyze_route(request:Request):
    verify(request)
    payload=await request.json()
    try:
        parsed, raw = analyze(payload.get("images", []), payload.get("findings", {}).get("signals", []))
        base=payload.get("supabase_url"); token=payload.get("access_token")
        body=json.dumps({"status":"complete","ai_model":MODEL,"prompt_version":PROMPT_VERSION,"raw_response":json.loads(raw),"parsed_result":parsed,"ai_priority":parsed["review_priority"]}).encode()
        req=UrlRequest(base.rstrip("/")+f"/rest/v1/ai_analyses?id=eq.{payload['analysis_id']}",body=body,method="PATCH",headers={"apikey":token,"Authorization":"Bearer "+token,"Content-Type":"application/json"})
        with urlopen(req,timeout=20): pass
        return {"status":"complete","parsed_result":parsed}
    except AIError as exc:
        raise HTTPException(422, str(exc))

@app.post("/process")
async def process(request:Request):
    global active
    verify(request)
    try: payload=await request.json()
    except Exception: raise HTTPException(400,"Invalid JSON body")
    required=("evidence_id","case_id","signed_url","media_type","supabase_url","access_token")
    if any(not payload.get(k) for k in required): raise HTTPException(422,"Missing processing field")
    with lock:
        if active>=int(limits.get("max_concurrent_tasks",5)): raise HTTPException(429,"Worker is at capacity")
        active+=1
    try:
        result=process_payload(payload,limits); persist(payload,result)
        return JSONResponse({"accepted":True,"processor_version":result["processor_version"],"metadata":result["metadata"]},202)
    except Exception as exc: raise HTTPException(400,str(exc)[:300])
    finally:
        with lock: active-=1
