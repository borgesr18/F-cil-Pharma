import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();

  if (profile?.role === 'pharmacy' || profile?.role === 'admin') redirect('/farmacia');
  if (profile?.role === 'nurse') redirect('/sala');

  return <div>Seu perfil não tem rota padrão. Contate o administrador.</div>;
}