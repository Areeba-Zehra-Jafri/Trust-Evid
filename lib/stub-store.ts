/**
 * STUB: in-memory case store for Phase 1.
 *
 * ⚠️  DATA RESETS ON PAGE REFRESH — this is intentional for Phase 1.
 *     Phase 2 replaces this module with Supabase Postgres calls.
 *     Do not add persistence here; that belongs in the real DB layer.
 */

import { Case, NewCaseInput, StubUser } from "./types";

let _cases: Case[] = [];

/** The simulated signed-in investigator for Phase 1. */
export const STUB_USER: StubUser = {
  id: "stub-user-001",
  email: "investigator@demo.local",
  role: "investigator",
  displayName: "Demo Investigator",
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getCases(): Case[] {
  return [..._cases].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getCaseById(id: string): Case | undefined {
  return _cases.find((c) => c.id === id);
}

export function createCase(input: NewCaseInput): Case {
  const now = new Date().toISOString();
  const newCase: Case = {
    id: generateId(),
    title: input.title.trim(),
    referenceNumber: input.referenceNumber.trim(),
    description: input.description.trim(),
    status: "open",
    createdAt: now,
    updatedAt: now,
    ownerUserId: STUB_USER.id,
    evidenceCount: 0,
  };
  _cases = [newCase, ..._cases];
  return newCase;
}

export function deleteCase(id: string): boolean {
  const before = _cases.length;
  _cases = _cases.filter((c) => c.id !== id);
  return _cases.length < before;
}
