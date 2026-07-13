import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import ImportForm from '@/components/ImportForm';
import { getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'mentor' && profile.role !== 'admin') redirect('/');

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Importar casos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cole um caso (ou uma lista de casos) em JSON. A validação segue a
          especificação: mínimo de 3 etapas, pelo menos uma discriminativa,
          casos ambíguos pontuados por referência, impostores com portão de
          segurança. Exemplos em <code className="rounded bg-zinc-100 px-1">cases/</code>{' '}
          no repositório.
        </p>
        <div className="mt-6">
          <ImportForm />
        </div>
      </main>
    </>
  );
}
