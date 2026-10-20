import { createServerClient } from '@supabase/ssr';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { notFound } from 'next/navigation';

export default async function CasePage({ params }: { params: { id: string } }) {
  const { user } = await requireAal2User(new Request('http://localhost'));

  const role = await requireCaseRole(params.id, user.id, ['investigator', 'uploader', 'examiner']);
  if (!role) {
    notFound();
  }

  const supabase = createServerClient({
    req: new Request('http://localhost'),
    res: new Response(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  });

  const { data: caseData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !caseData) {
    notFound();
  }

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">{caseData.title}</h1>
      <p>{caseData.description}</p>
    </main>
  );
}
