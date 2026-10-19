/**
 * GET /api/health
 * Simple health-check endpoint used by uptime monitors and the deploy pipeline.
 * Phase 1: always returns ok. Later phases add DB and worker reachability checks.
 */
export async function GET() {
  return Response.json({
    status: "ok",
    phase: 1,
    message: "TRUST-EVID AI API is running (Phase 1 — in-memory stub)",
    timestamp: new Date().toISOString(),
  });
}
