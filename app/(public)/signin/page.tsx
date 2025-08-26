'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import type { Database } from '@/lib/supabase/types';

const supabase = createClientComponentClient<Database>();

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/dashboard' } });
    if (!error) setSent(true);
    else alert(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={sendMagicLink} className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <input className="border rounded w-full p-2" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="w-full rounded bg-black text-white py-2">Enviar link mágico</button>
        {sent && <p>Cheque seu e-mail para continuar.</p>}
      </form>
    </div>
  );
}