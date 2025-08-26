import '../globals.css';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/supabase/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen grid place-content-center gap-4 p-6">
        <p>Você precisa entrar para acessar o sistema.</p>
        <Link className="underline" href="/signin">Ir para login</Link>
      </div>
    );
  }
  return (
    <html lang="pt-br"><body>
      <header className="border-b p-3 flex gap-4 items-center">
        <Link href="/dashboard" className="font-semibold">Pedidos & Farmácia</Link>
        <nav className="flex gap-3 text-sm">
          <Link href="/sala">Sala</Link>
          <Link href="/farmacia">Farmácia</Link>
        </nav>
      </header>
      <main className="p-4">{children}</main>
    </body></html>
  );
}