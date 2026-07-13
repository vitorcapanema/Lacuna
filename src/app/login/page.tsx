'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'link_invalido'
      ? 'Link inválido ou expirado. Peça um novo.'
      : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">
          Lacuna<span className="text-emerald-600">·</span>Casos
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Treinador de raciocínio clínico. Entre com seu e-mail — sem senha.
        </p>

        {sent ? (
          <p className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            Link enviado para <strong>{email}</strong>. Abra seu e-mail e clique
            para entrar.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Enviando…' : 'Enviar link mágico'}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
