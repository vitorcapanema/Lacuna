import Link from 'next/link';
import { Profile } from '@/lib/supabase/server';

export default function Nav({ profile }: { profile: Profile }) {
  const canImport = profile.role === 'mentor' || profile.role === 'admin';

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Lacuna<span className="text-emerald-600">·</span>Casos
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            Casos
          </Link>
          <Link href="/simulador" className="text-zinc-600 hover:text-zinc-900">
            Simulador
          </Link>
          <Link href="/painel" className="text-zinc-600 hover:text-zinc-900">
            Painel
          </Link>
          {canImport && (
            <Link href="/import" className="text-zinc-600 hover:text-zinc-900">
              Importar
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="text-zinc-400 hover:text-zinc-700" type="submit">
              Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
