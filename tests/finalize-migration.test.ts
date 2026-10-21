import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20261021070000_atomic_evidence_finalization.sql', 'utf8').toLowerCase();

describe('transactional finalization migration contract', () => {
  it('requires authenticated AAL2 case authorization and a hardened definer', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("auth.uid() is null");
    expect(sql).toContain("auth.jwt() ->> 'aal'");
    expect(sql).toContain('set search_path = \'\'');
    expect(sql).toContain('for update');
    expect(sql).toContain('where id=p_evidence_id and case_id=p_case_id');
    expect(sql).toContain('revoke all on function');
    expect(sql).toContain('grant execute on function');
    expect(sql).not.toContain('exception when unique_violation');
  });

  it('validates digest, positive exact file size, and retry metadata', () => {
    expect(sql).toContain("p_sha256 is null");
    expect(sql).toContain("p_sha256 !~ '^[0-9a-fa-f]{64}$'");
    expect(sql).toContain('p_byte_count is null');
    expect(sql).toContain('p_byte_count <= 0');
    expect(sql).toContain('e.file_size');
    expect(sql).toContain('byte_count');
    expect(sql).toContain('conflicting intake');
    expect(sql).toContain('evidence_hash is null');
    expect(sql).toContain('lower(existing.evidence_hash)');
  });

  it('preserves statuses and atomic custody behavior', () => {
    expect(sql).toContain("processing_status='awaiting_upload'");
    expect(sql).toContain("then 'uploaded'");
    expect(sql).toContain('insert into public.custody_events');
    expect(sql).toContain('uploaded_at');
    expect(sql).not.toContain("processing_status='ready'");
  });

  it('requires duplicate-history preflight and a verified existing-index definition', () => {
    expect(sql).toContain('duplicate');
    expect(sql).toContain('pg_indexes');
    expect(sql).toContain('indisunique');
    expect(sql).not.toContain('create unique index if not exists');
  });

  it('does not silently remediate duplicate history', () => {
    expect(sql).not.toMatch(/\b(delete|truncate)\s+from\s+public\.custody_events/);
    expect(sql).not.toMatch(/\bupdate\s+public\.custody_events/);
  });
});


describe('additional migration safety expectations', () => {
  it('guards index readiness and unsupported statuses', () => {
    expect(sql).toContain('indisvalid');
    expect(sql).toContain('indisready');
    expect(sql).toContain('processing_status not in');
  });

  it('does not use broad exception recovery or mutate custody history', () => {
    expect(sql).not.toContain('exception when unique_violation');
    expect(sql).not.toMatch(/delete\s+from\s+public\.custody_events/);
    expect(sql).not.toMatch(/update\s+public\.custody_events/);
  });
});
