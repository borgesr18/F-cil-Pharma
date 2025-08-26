'use client';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const supabase = createClient();

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Email enviado!</h2>
            <p className="text-sm">
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              Se não encontrar o email, verifique a pasta de spam.
            </p>
          </div>
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Recuperar Senha</h1>
          <p className="mt-2 text-gray-600">
            Digite seu email para receber um link de recuperação
          </p>
        </div>
        
        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>
        
        <div className="text-center">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Login
          </Link>
        </div>
      </div>
    </div>
  );
}