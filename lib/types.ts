/**
 * Shared TypeScript types for TRUST-EVID AI.
 * Phase 1: in-memory stubs. These shapes mirror the final DB schema (SPEC §10)
 * so wiring to Supabase later requires no structural changes.
 */

export type CaseStatus = "open" | "closed" | "archived";

export interface Case {
  id: string;
  title: string;
  referenceNumber: string;
  description: string;
  status: CaseStatus;
  createdAt: string; // ISO 8601
  updatedAt: string;
  /** Stub: owner is the simulated investigator in phase 1 */
  ownerUserId: string;
  evidenceCount: number;
}

export interface NewCaseInput {
  title: string;
  referenceNumber: string;
  description: string;
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/** Simulated session user – replaced by Supabase Auth in phase 2 */
export interface StubUser {
  id: string;
  email: string;
  role: "investigator" | "uploader" | "examiner";
  displayName: string;
}
