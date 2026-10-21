import { createServerClient } from '@supabase/ssr';
import { requireAal2User } from '@/lib/authz';
import Link from 'next/link';

export default async function DashboardPage() {
  await requireAal2User(new Request('http://localhost'));

  const supabase = createServerClient({
    req: new Request('http://localhost'),
    res: new Response(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  });

  const { data: cases, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <ul>
        {cases.map((c) => (
          <li key={c.id}>
            <Link href={`/cases/${c.id}`}>{c.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
