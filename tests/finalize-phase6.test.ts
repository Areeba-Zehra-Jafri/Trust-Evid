import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20261021070000_atomic_evidence_finalization.sql', 'utf8').toLowerCase();

describe('phase 6 finalization safety contracts', () => {
  it('covers terminal-state rejection and preserves active processing states', () => {
    expect(sql).toContain("e.processing_status in ('failed','rejected')");
    expect(sql).toContain("processing_status='awaiting_upload'");
    expect(sql).not.toContain("processing_status='ready'");
  });

  it('requires an existing intake event to agree on digest and byte count', () => {
    expect(sql).toContain('existing.evidence_hash is null');
    expect(sql).toContain('lower(existing.evidence_hash)');
    expect(sql).toContain("existing.details ? 'byte_count'");
    expect(sql).toContain("'inconsistent finalized evidence'");
    expect(sql).toContain("'already_finalized'");
  });

  it('performs duplicate-history and existing-index safety checks', () => {
    expect(sql).toContain('duplicate intake history requires read-only remediation');
    expect(sql).toContain('pg_class');
    expect(sql).toContain('indisunique');
    expect(sql).not.toContain('create unique index if not exists');
  });

  it('keeps custody events append-only and does not turn uniqueness errors into success', () => {
    expect(sql).not.toContain('exception when unique_violation');
    expect(sql).not.toMatch(/\b(delete|truncate)\s+from\s+public\.custody_events/);
    expect(sql).not.toMatch(/\bupdate\s+public\.custody_events/);
    expect(sql).toContain('for update');
    expect(sql).toContain('insert into public.custody_events');
  });

  it('records the boundary of source-contract coverage', () => {
    // Source checks cover the migration contract only; they do not prove SQL
    // rollback, row locks, or concurrent-session behavior without PostgreSQL.
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
  });
});


describe('phase 6 validation and repeatability contracts', () => {
  it('normalizes the digest before both write and retry comparison', () => {
    expect(sql).toContain("lower(p_sha256)");
    expect(sql).toContain("lower(e.sha256_original)");
    expect(sql).toContain("lower(existing.evidence_hash)");
    expect(sql).toContain("sha256_original=coalesce(sha256_original,lower(p_sha256))");
  });

  it('requires a positive integer count and compares it to the stored file size', () => {
    expect(sql).toContain('p_byte_count <= 0');
    expect(sql).toContain('e.file_size is null');
    expect(sql).toContain('e.file_size <> p_byte_count');
    expect(sql).toContain('::bigint');
  });

  it('keeps authorization and relationship checks before mutation', () => {
    expect(sql).toContain("coalesce(auth.jwt() ->> 'aal','') <> 'aal2'");
    expect(sql).toContain("cm.role in ('investigator','uploader')");
    expect(sql).toContain('where id=p_evidence_id and case_id=p_case_id for update');
    expect(sql).toContain('where id=p_evidence_id;');
  });

  it('documents the missing database-level proof points instead of pretending source checks are integration tests', () => {
    expect(sql).toContain('Local-only Phase 5 migration');
    // These tests intentionally do not claim to prove rollback, row locking, or
    // two-session uniqueness. Those require disposable PostgreSQL execution.
    expect(sql).toContain('duplicate intake history requires read-only remediation');
  });
});
