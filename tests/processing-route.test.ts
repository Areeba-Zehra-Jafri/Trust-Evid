import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  requireAal2User: vi.fn(),
  requireCaseRole: vi.fn(),
}));
vi.mock('@/lib/authz', () => auth);

import { POST } from '@/app/api/cases/[id]/evidence/process/route';

const evidenceId = '11111111-1111-4111-8111-111111111111';
const user = { id: 'user-1' };
const from = vi.fn();
const supabase = { from };
const request = (body: unknown, raw = false) => new Request('http://local', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: raw ? String(body) : JSON.stringify(body),
});
const call = (req: Request) => POST(req, { params: Promise.resolve({ id: 'case-1' }) });

beforeEach(() => {
  vi.resetAllMocks();
  process.env.WORKER_URL = 'https://worker.test/';
  process.env.WORKER_SHARED_SECRET = 'secret';
  auth.requireAal2User.mockResolvedValue({ user, supabase });
  auth.requireCaseRole.mockResolvedValue('investigator');
  from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: evidenceId, case_id: 'case-1' }, error: null }) }) }) }) });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 202 })));
});

describe('processing dispatch API', () => {
  it('rejects malformed JSON and invalid or extra fields', async () => {
    expect((await call(request('{', true))).status).toBe(400);
    expect((await call(request({}))).status).toBe(400);
    expect((await call(request({ evidence_id: evidenceId, extra: true }))).status).toBe(400);
    expect((await call(request({ evidence_id: 'not-a-uuid' }))).status).toBe(400);
  });

  it('preserves authentication and authorization failures', async () => {
    auth.requireAal2User.mockRejectedValueOnce(new Response('Unauthorized', { status: 401 }));
    await expect(call(request({ evidence_id: evidenceId }))).rejects.toMatchObject({ status: 401 });
    auth.requireAal2User.mockResolvedValueOnce({ user, supabase });
    auth.requireAal2User.mockRejectedValueOnce(new Response('Forbidden', { status: 403 }));
    await expect(call(request({ evidence_id: evidenceId }))).rejects.toMatchObject({ status: 403 });
    auth.requireAal2User.mockResolvedValueOnce({ user, supabase });
    auth.requireCaseRole.mockResolvedValueOnce(null);
    expect((await call(request({ evidence_id: evidenceId }))).status).toBe(403);
  });

  it('scopes lookup to both case and evidence', async () => {
    await call(request({ evidence_id: evidenceId }));
    expect(from).toHaveBeenCalledWith('evidence');
    expect(auth.requireCaseRole).toHaveBeenCalledWith('case-1', 'user-1', ['investigator', 'uploader']);
  });

  it('dispatches exactly the worker contract with a timeout signal', async () => {
    await call(request({ evidence_id: evidenceId }));
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://worker.test/process');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', 'X-Worker-Secret': 'secret' });
    expect(JSON.parse(String(init?.body))).toEqual({ evidence_id: evidenceId });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('handles configuration, lookup, missing evidence, worker and network failures', async () => {
    delete process.env.WORKER_URL;
    expect((await call(request({ evidence_id: evidenceId }))).status).toBe(503);
    process.env.WORKER_URL = 'https://worker.test';
    from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) }) });
    expect((await call(request({ evidence_id: evidenceId }))).status).toBe(404);
    from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('db') }) }) }) }) });
    expect((await call(request({ evidence_id: evidenceId }))).status).toBe(500);
    from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: evidenceId }, error: null }) }) }) }) });
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect((await call(request({ evidence_id: evidenceId }))).status).toBe(502);
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
    expect((await call(request({ evidence_id: evidenceId }))).status).toBe(502);
  });

  it('returns the documented success response without changing status', async () => {
    const response = await call(request({ evidence_id: evidenceId }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true, requested_by: 'user-1' });
  });
});
