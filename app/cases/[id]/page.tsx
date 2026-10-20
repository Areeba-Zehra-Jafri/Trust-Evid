import { supabaseServer } from '@/lib/supabase/server';
import { requireAal2User, requireCaseRole } from '@/lib/authz';
import { notFound } from 'next/navigation';

export default async function CasePage({ params }: { params: { id: string } }) {
  const user = await requireAal2User(new Request(''));
  if (!user) {
    notFound();
  }

  const role = await requireCaseRole(params.id, user.id, ['investigator', 'uploader', 'examiner']);
  if (!role) {
    notFound();
  }

  const { data: caseData, error } = await supabaseServer
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !caseData) {
    notFound();
  }

  return (
    <>
      <h1>{caseData.title}</h1>
      <p>{caseData.description}</p>
      <p>Status: {caseData.status}</p>
    </>
  );
}
