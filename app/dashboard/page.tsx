import { supabaseServer } from '@/lib/supabase/server';
import { requireAal2User } from '@/lib/authz';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await requireAal2User(new Request('')); // dummy request
  if (!user) {
    redirect('/auth/login');
  }

  const { data: cases, error } = await supabaseServer
    .from('cases')
    .select('*, evidence_count:cases_evidences(count)')
    .order('created_at', { ascending: false });

  if (error) {
    return <p>Failed to load cases.</p>;
  }

  return (
    <>
      <h1>Dashboard</h1>
      <ul>
        {cases?.map((c) => (
          <li key={c.id}>{c.title} ({c.evidence_count})</li>
        ))}
      </ul>
    </>
  );
}
