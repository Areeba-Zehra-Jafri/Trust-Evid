# 05 · Worker skeleton (FastAPI)

```python
# worker/main.py
import asyncio, hmac, json, os
from contextlib import asynccontextmanager
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

LIMITS = json.load(open(os.path.join(os.path.dirname(__file__), "limits.json")))
L = LIMITS                                     # skills 06, 09 and 11 refer to it as L
JOB_LOCK = asyncio.Lock()

@asynccontextmanager
async def lifespan(app):
    # Single instance: anything still 'processing' at boot died with the last process.
    db.fail_stuck("worker restarted")
    yield

app = FastAPI(lifespan=lifespan)

def require_secret(x_worker_secret: str = Header(default="")):
    ok = hmac.compare_digest(x_worker_secret.encode(), os.environ["WORKER_SHARED_SECRET"].encode())
    if not ok:
        raise HTTPException(401, "unauthorized")

class Req(BaseModel):
    evidence_id: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/process", status_code=202, dependencies=[Depends(require_secret)])
async def process(req: Req, bg: BackgroundTasks):
    bg.add_task(run_job, req.evidence_id)
    return {"accepted": True}

class Rejected(Exception):
    def __init__(self, limit, max=None, actual=None):
        self.detail = {"limit": limit, "max": max, "actual": actual}

async def run_job(evidence_id: str):
    async with JOB_LOCK:                          # one job at a time; others stay 'queued'
        # Atomic claim: UPDATE ... SET processing_status='processing'
        #               WHERE id=:id AND processing_status='queued' RETURNING id
        if not db.claim(evidence_id):
            return                                # already claimed, done, rejected, or wrong state
        try:
            await asyncio.to_thread(pipeline, evidence_id)   # blocking work off the event loop
        except Rejected as r:
            db.reject(evidence_id, r.detail)
        except Exception as e:
            db.mark_failed(evidence_id, {"error": type(e).__name__})   # short reason, no stack
```

`pipeline()` is synchronous and runs in order, updating the three status fields as it goes: intake (06), metadata (07), checks (08 or 09), findings and priority (10), AI (11), done.

Deadline: set `deadline = time.monotonic() + LIMITS["job_timeout_s"]` at the start and call `check_deadline()` between steps. Every subprocess (ffmpeg, ffprobe, exiftool) also has its own timeout. Raise `RuntimeError("job timeout")` when the deadline passes.

Rules:
- Look everything up by `evidence_id` from the DB. Never trust paths from the request.
- Use a temp dir per job and remove it in `finally`.
- No CORS config: only the server calls the worker.
- `POST /verify` follows the same auth, streams the stored object, and returns `{match, computed, registered, verified_at}` (skill 12).

Done when: a call without the secret gets 401, `/process` returns in under a second, `/health` still answers while a job runs, and calling `/process` twice for one evidence runs it once.
