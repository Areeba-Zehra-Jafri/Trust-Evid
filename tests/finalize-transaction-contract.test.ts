import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20261021070000_atomic_evidence_finalization.sql', 'utf8').toLowerCase();

describe('transaction-safe finalization phase 6 contract matrix', () => {
  it.each([
    ['digest is required', 'p_sha256 is null'],
    ['digest is hexadecimal sha256', "p_sha256 !~ '^[0-9a-fA-F]{64}$'"],
    ['byte count is required', 'p_byte_count is null'],
    ['byte count is positive', 'p_byte_count <= 0'],
    ['byte count matches recorded file size', 'e.file_size <> p_byte_count'],
  ])('guards %s', (_name, fragment) => expect(sql).toContain(fragment));

  it('allows only the documented active statuses and rejects unknown states', () => {
    expect(sql).toContain("e.processing_status not in ('awaiting_upload','uploaded','processing','ready')");
    expect(sql).toContain("processing_status='awaiting_upload'");
    expect(sql).toContain("then 'uploaded'");
    expect(sql).not.toContain("processing_status='failed'");
    expect(sql).not.toContain("processing_status='rejected'");
  });

  it('checks AAL2, role, and the requested case/evidence relationship before mutation', () => {
    expect(sql).toContain("coalesce(auth.jwt() ->> 'aal','') <> 'aal2'");
    expect(sql).toContain("cm.role in ('investigator','uploader')");
    expect(sql).toContain('where id=p_evidence_id and case_id=p_case_id for update');
    expect(sql).toContain('where id=p_evidence_id and case_id=p_case_id;');
  });

  it('makes first finalization and matching retries explicit', () => {
    expect(sql).toContain("event_type='intake'");
    expect(sql).toContain('insert into public.custody_events');
    expect(sql).toContain("'state','finalized'");
    expect(sql).toContain("'state','already_finalized'");
    expect(sql).toContain("raise exception 'conflicting hash'");
    expect(sql).toContain("raise exception 'conflicting intake'");
    expect(sql).toContain("existing.details ? 'byte_count'");
  });

  it('keeps rollback and concurrency safeguards in the database boundary', () => {
    expect(sql).toContain('for update');
    expect(sql).toContain('create unique index custody_events_one_intake_per_evidence');
    expect(sql).toContain('duplicate intake history requires read-only remediation');
    expect(sql).not.toContain('exception when unique_violation');
    expect(sql).not.toMatch(/delete\s+from\s+public\.custody_events/);
    expect(sql).not.toMatch(/update\s+public\.custody_events/);
  });

  it('restricts the definer entry point and fixes its search path', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('revoke all on function');
    expect(sql).toContain('from public, anon');
    expect(sql).toContain('grant execute on function');
    expect(sql).toContain('to authenticated');
  });

  it('marks source checks as non-proof of PostgreSQL rollback/concurrency', () => {
    // This is intentionally a contract test. Only disposable PostgreSQL sessions
    // can establish transaction rollback, lock ordering, and duplicate prevention.
    expect(sql).toContain('local-only phase 5 migration');
  });
});
