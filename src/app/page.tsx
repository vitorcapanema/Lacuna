import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import StartCaseButton from '@/components/StartCaseButton';
import { createAdminClient, getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  padrao: 'Padrão',
  variacao: 'Variação',
  impostor: 'Impostor',
  armadilha: 'Armadilha',
  ambiguo: 'Ambíguo',
};

interface LibraryCase {
  id: string;
  title: string;
  area: string;
  type: string;
  difficulty: number;
}

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const admin = createAdminClient();
  // Só metadados públicos do caso saem para a biblioteca — claim, etapas,
  // desfecho e lição ficam no servidor até a hora certa.
  const { data } = await admin
    .from('cases')
    .select('id, title, area, type, difficulty')
    .eq('published', true)
    .order('created_at', { ascending: true });
  const cases = (data ?? []) as LibraryCase[];

  const { data: attemptsData } = await admin
    .from('attempts')
    .select('id, case_id, completed_at')
    .eq('user_id', profile.id)
    .order('started_at', { ascending: false });
  const attempts = attemptsData ?? [];
  const openByCase = new Map<string, string>();
  const completedCount = new Map<string, number>();
  for (const a of attempts) {
    if (!a.completed_at && !openByCase.has(a.case_id)) openByCase.set(a.case_id, a.id);
    if (a.completed_at)
      completedCount.set(a.case_id, (completedCount.get(a.case_id) ?? 0) + 1);
  }

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Banco de Casos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A cada etapa você declara sua confiança na proposição do caso — e trava
          antes de ver a próxima. O que se mede é o comportamento de revisão.
        </p>

        {cases.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            Nenhum caso publicado ainda.
            {(profile.role === 'mentor' || profile.role === 'admin') && (
              <>
                {' '}
                Importe os primeiros casos em <a href="/import" className="text-emerald-700 underline">Importar</a>.
              </>
            )}
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {cases.map((c) => {
              const openAttempt = openByCase.get(c.id);
              const done = completedCount.get(c.id) ?? 0;
              return (
                <li
                  key={c.id}
                  className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium uppercase tracking-wide text-zinc-600">
                        {c.area}
                      </span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                        {TYPE_LABEL[c.type] ?? c.type}
                      </span>
                      <span className="text-zinc-400" title={`Dificuldade ${c.difficulty}/5`}>
                        {'●'.repeat(c.difficulty)}
                        {'○'.repeat(5 - c.difficulty)}
                      </span>
                    </div>
                    <h2 className="mt-2 font-semibold">{c.title}</h2>
                    {done > 0 && (
                      <p className="mt-1 text-xs text-zinc-400">
                        {done} tentativa{done > 1 ? 's' : ''} concluída{done > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="mt-4">
                    {openAttempt ? (
                      <a
                        href={`/play/${openAttempt}`}
                        className="inline-block rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-900"
                      >
                        Continuar tentativa
                      </a>
                    ) : (
                      <StartCaseButton
                        caseId={c.id}
                        label={done > 0 ? 'Nova tentativa' : 'Iniciar caso'}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
