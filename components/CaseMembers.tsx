"use client";

import { useCallback, useEffect, useState } from "react";

type Member = { user_id: string; role: string; email: string | null };

export function CaseMembers({ caseId, canManage }: { caseId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("uploader");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/cases/${caseId}/members`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load case members.");
      setMembers(data.members ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load case members.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function addMember() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/cases/${caseId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not add member.");
      setEmail(""); setSuccess("Member added.");
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add member.");
    } finally { setBusy(false); }
  }

  return (
    <section className="card mt-6 p-4" aria-labelledby="members-heading">
      <h2 id="members-heading" className="font-semibold">Case members</h2>
      {loading ? <p className="mt-3 text-sm text-slate-500">Loading members…</p> : members.length === 0 ? <p className="mt-3 text-sm text-slate-500">No members found.</p> : <ul className="mt-3 space-y-2 text-sm">{members.map((member) => <li key={member.user_id} className="flex flex-wrap justify-between gap-2"><span>{member.email ?? member.user_id}</span><span className="text-slate-500">{member.role}</span></li>)}</ul>}
      {canManage && <div className="mt-4 flex flex-wrap gap-2"><label className="sr-only" htmlFor="member-email">Member email</label><input id="member-email" className="input max-w-xs" type="email" placeholder="member@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /><label className="sr-only" htmlFor="member-role">Member role</label><select id="member-role" className="input w-auto" value={role} onChange={(event) => setRole(event.target.value)} disabled={busy}><option value="investigator">Investigator</option><option value="uploader">Uploader</option><option value="examiner">Examiner</option></select><button className="btn-primary" onClick={() => void addMember()} disabled={busy || !email.trim()}>{busy ? "Adding…" : "Add member"}</button></div>}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="mt-2 text-sm text-green-700">{success}</p>}
    </section>
  );
}
