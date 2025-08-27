'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      'Supabase envs ausentes: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    throw new Error('Configuração Supabase inválida: variáveis de ambiente ausentes');
  }

  return createBrowserClient<Database>(url, key);
}

// Para compatibilidade com código existente
export const supabase = createClient();