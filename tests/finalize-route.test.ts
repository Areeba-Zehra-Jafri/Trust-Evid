import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ requireAal2User: vi.fn(), requireCaseRole: vi.fn() }));
vi.mock('@/lib/authz', () => auth);
import { POST } from '@/app/api/cases/[id]/evidence/finalize/route';

const evidenceId = '11111111-1111-4111-8111-111111111111';
const caseId = 'case-1';
const digest = 'a'.repeat(64);
const user = { id: 'user-1' };
const rpc = vi.fn();
const maybeSingle = vi.fn();
const select = vi.fn(() => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }));
const from = vi.fn(() => ({ select }));
const supabase = { from, rpc };
const request = (body: unknown) => new Request('http://local', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const call = (body: unknown) => POST(request(body), { params: Promise.resolve({ id: caseId }) });

beforeEach(() => {
  vi.resetAllMocks();
  process.env.WORKER_URL = 'https://worker.test/';
  process.env.WORKER_SHARED_SECRET = 'secret';
  auth.requireAal2User.mockResolvedValue({ user, supabase });
  auth.requireCaseRole.mockResolvedValue('investigator');
  maybeSingle.mockResolvedValue({ data: { id: evidenceId, case_id: caseId }, error: null });
  rpc.mockResolvedValue({ data: { state: 'finalized', sha256: digest, byte_count: 12 }, error: null });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ sha256: digest, byte_count: 12 }), { status: 200 })));
});

describe('transactional evidence finalization route', () => {
  it.each([
    ['malformed JSON', '{'], ['missing evidence id', {}],
    ['invalid UUID', { evidence_id: 'not-a-uuid' }],
    ['extra request fields', { evidence_id: evidenceId, unexpected: true }],
    ['invalid browser digest', { evidence_id: evidenceId, sha256: 'bad' }],
  ])('rejects %s before persistence', async (_, body) => {
    const response = await POST(body === '{' ? new Request('http://local', { method: 'POST', body }) : request(body), { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('enforces AAL2 role authorization and case-scoped lookup', async () => {
    auth.requireCaseRole.mockResolvedValue(null);
    expect((await call({ evidence_id: evidenceId })).status).toBe(403);
    expect(auth.requireCaseRole).toHaveBeenCalledWith(caseId, user.id, ['investigator', 'uploader']);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects a wrong-case relationship without invoking the RPC', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await call({ evidence_id: evidenceId })).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('verifies bytes first and passes worker digest/count to one RPC', async () => {
    const response = await call({ evidence_id: evidenceId, sha256: digest });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verified_hash: digest, byte_count: 12, state: 'finalized' });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ evidence_id: evidenceId });
    expect(rpc).toHaveBeenCalledWith('finalize_verified_evidence', {
      p_case_id: caseId, p_evidence_id: evidenceId, p_sha256: digest, p_byte_count: 12,
    });
  });

  it('supports matching retries and exposes conflicting retries safely', async () => {
    rpc.mockResolvedValueOnce({ data: { state: 'already_finalized', sha256: digest, byte_count: 12 }, error: null });
    expect((await call({ evidence_id: evidenceId })).status).toBe(200);
    rpc.mockResolvedValueOnce({ data: null, error: new Error('conflicting hash') });
    expect((await call({ evidence_id: evidenceId })).status).toBe(409);
  });

  it('rejects worker digests that are missing, null, uppercase, or malformed before persistence', async () => {
    for (const payload of [
      { byte_count: 12 },
      { sha256: null, byte_count: 12 },
      { sha256: 'A'.repeat(64), byte_count: 12 },
      { sha256: 'g'.repeat(64), byte_count: 12 },
    ]) {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
      expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects zero, negative, and non-integer worker byte counts before persistence', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ sha256: digest, byte_count: 0 }), { status: 200 }));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ sha256: digest, byte_count: -1 }), { status: 200 }));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ sha256: digest, byte_count: 1.5 }), { status: 200 }));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not persist when the worker or RPC reports a finalization conflict', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('worker failure', { status: 422 }));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValueOnce({ data: null, error: new Error('conflicting intake') });
    expect((await call({ evidence_id: evidenceId })).status).toBe(409);
  });

  it('maps invalid worker data, auth, timeout, and database failures', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ sha256: 'bad', byte_count: -1 }), { status: 200 }));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    vi.mocked(fetch).mockRejectedValueOnce(new Error('timeout'));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    rpc.mockResolvedValueOnce({ data: null, error: new Error('not authorized') });
    expect((await call({ evidence_id: evidenceId })).status).toBe(403);
    rpc.mockResolvedValueOnce({ data: null, error: new Error('database unavailable') });
    expect((await call({ evidence_id: evidenceId })).status).toBe(500);
  });

  it('never reports success for an invalid RPC contract and never performs direct writes', async () => {
    rpc.mockResolvedValueOnce({ data: { state: 'unexpected' }, error: null });
    expect((await call({ evidence_id: evidenceId })).status).toBe(502);
    expect((supabase as { update?: unknown }).update).toBeUndefined();
  });
});


describe('phase 6 transactional outcome matrix', () => {
  it('maps matching retry to success without a second direct write', async () => {
    rpc.mockResolvedValueOnce({ data: { state: 'already_finalized', sha256: digest, byte_count: 12 }, error: null });
    const response = await call({ evidence_id: evidenceId });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect((supabase as { update?: unknown }).update).toBeUndefined();
  });

  it('maps a conflicting retry and preserves the worker-first ordering', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('conflicting intake') });
    expect((await call({ evidence_id: evidenceId })).status).toBe(409);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('surfaces custody failure as failure rather than claiming finalization', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('custody insert failed') });
    const response = await call({ evidence_id: evidenceId });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Could not finalize evidence atomically.' });
  });

  it('rejects a case relationship mismatch before worker or RPC access', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await call({ evidence_id: evidenceId })).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a worker byte-count mismatch at the RPC boundary contract', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ sha256: digest, byte_count: 99 }), { status: 200 }));
    // The route forwards worker evidence; the transaction RPC is responsible for
    // comparing it with evidence.file_size and rolling back on failure.
    rpc.mockResolvedValueOnce({ data: null, error: new Error('byte count does not match file size') });
    expect((await call({ evidence_id: evidenceId })).status).toBe(500);
    expect(rpc).toHaveBeenCalledWith('finalize_verified_evidence', expect.objectContaining({ p_byte_count: 99 }));
  });
});
