import os
import hmac
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="Worker Service")

# CORS for local testing and flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load limits (not used yet but ready to expand)
LIMITS_PATH = "worker/limits.json"
try:
    with open(LIMITS_PATH, "r") as f:
        limits = json.load(f)
except Exception:
    limits = {}

WORKER_SECRET = os.getenv("WORKER_SHARED_SECRET")


def verify_worker_secret(request: Request) -> None:
    header_secret = request.headers.get("X-Worker-Secret")
    if not WORKER_SECRET:
        # Fail closed if env var is unset
        raise HTTPException(status_code=401, detail="Worker secret not configured")
    if not header_secret or not hmac.compare_digest(header_secret, WORKER_SECRET):
        raise HTTPException(status_code=401, detail="Invalid or missing worker secret")


@app.get("/health")
async def health():
    return JSONResponse(content={"ok": True})


@app.post("/process")
async def process(request: Request, background_tasks: BackgroundTasks):
    verify_worker_secret(request)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    evidence_id = data.get("evidence_id")
    if not evidence_id:
        raise HTTPException(status_code=422, detail="Missing required field: evidence_id")

    # Stub processing task
    def stub_processing_task(evidence_id: str):
        # Placeholder for real processing logic
        pass

    background_tasks.add_task(stub_processing_task, evidence_id)

    return JSONResponse(status_code=202, content={"accepted": True})
