import Link from 'next/link';
import { requireAal2User } from '@/lib/authz';
export default async function DashboardPage() {
  const { supabase } = await requireAal2User();
  const { data: cases, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return <main className="p-4"><div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Cases</h1><Link className="btn-primary" href="/cases/new">New case</Link></div>{!cases?.length ? <p className="text-slate-500">No cases yet.</p> : <ul className="space-y-2">{cases.map((c) => <li className="card p-4" key={c.id}><Link className="font-semibold" href={`/cases/${c.id}`}>{c.title}</Link><p className="text-sm text-slate-500">{c.reference_number} · {c.status}</p></li>)}</ul>}</main>;
}
