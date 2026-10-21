"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NewCaseInput } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { CaseForm } from '@/components/CaseForm';

export default function NewCasePage() {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function handleSubmit(input: NewCaseInput) {
    setLoading(true); setError('');
    try { const response = await fetch('/api/cases', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(input) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || Object.values(body.errors || {}).join(', ') || 'Could not create case'); router.push(`/cases/${body.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create case'); setLoading(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-6"><PageHeader title="Create new case" subtitle="Use synthetic or authorized demonstration data only." />{error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<div className="card p-6"><CaseForm onSubmit={handleSubmit} loading={loading} /></div></div>;
}
