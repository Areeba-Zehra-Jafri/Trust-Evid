# 15 · Render deployment

## Create the service in the dashboard
Create the web service through the Render dashboard (Docker, free plan, root `worker/`). I couldn't confirm whether Blueprint deploys require a payment method, so treat `render.yaml` as documentation until you've tested it without a card.

## Dockerfile (`worker/Dockerfile`)
`worker/limits.json` is inside the build context, so it ships with the image.

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libimage-exiftool-perl libmagic1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
```

`requirements.txt`: `fastapi`, `uvicorn`, `httpx`, `pydantic`, `supabase`, `python-magic`, `pillow`, `numpy`, `opencv-python-headless`, and the Gemini SDK. No PyTorch or TensorFlow.

## Settings
- Health check path: `/health`
- Env vars: `WORKER_SHARED_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `AI_MODEL`
- Documentation-only `render.yaml`:

```yaml
services:
  - type: web
    name: trust-evid-worker
    runtime: docker
    plan: free
    dockerfilePath: ./worker/Dockerfile
    dockerContext: ./worker
    healthCheckPath: /health
```

## Free-tier reality
512 MB RAM, 0.1 CPU, ephemeral disk, sleeps after 15 idle minutes, and the first request afterwards takes about a minute. So:
- The web app pings `/health` when the upload page opens, and the UI shows "starting analysis service".
- One job at a time, stream everything, cap frames, no transcoding.
- Keep the worst-case job under 15 minutes (`job_timeout_s`), since browsers poll Supabase, not the worker, and idle time counts.
- Free instances can restart anytime, which is why startup fails stuck jobs and the UI offers Retry.
- Wake the worker before any demo.

## Day-1 smoke test
Deploy a minimal worker (`/health` + ffprobe), then run the largest demo video through browser, storage, worker and hash match. Record decode time and peak memory in `CONTEXT.md`, then tune `worker/limits.json`.

## Vercel and Supabase
Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `PROCESSING_URL`, `WORKER_SHARED_SECRET`. Supabase free projects pause after 7 idle days, so open the app the day before judging.

Done when: the deployed worker passes the smoke test with the largest demo video and no out-of-memory restart.
