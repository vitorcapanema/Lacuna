import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import { BrierTimeline, CalibrationChart } from '@/components/PanelCharts';
import { createAdminClient, getProfile } from '@/lib/supabase/server';
import { CompletedAttempt, computePersonalMetrics } from '@/lib/metrics';
import { AttemptScore, MIN_ATTEMPTS_FOR_AGGREGATES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  padrao: 'Padrão',
  variacao: 'Variação',
  impostor: 'Impostor',
  armadilha: 'Armadilha',
  ambiguo: 'Ambíguo',
};

interface AttemptWithCase {
  id: string;
  completed_at: string;
  score: AttemptScore;
  cases: {
    title: string;
    area: string;
    type: string;
    score_mode: 'outcome' | 'reference';
    safety_gate: boolean;
    ground_truth: { outcome: boolean };
  };
}

export default async function PanelPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const admin = createAdminClient();
  const { data } = await admin
    .from('attempts')
    .select(
      'id, completed_at, score, cases (title, area, type, score_mode, safety_gate, ground_truth)'
    )
    .eq('user_id', profile.id)
    .not('completed_at', 'is', null);

  const attempts: CompletedAttempt[] = ((data ?? []) as unknown as AttemptWithCase[]).map(
    (a) => ({
      id: a.id,
      completedAt: a.completed_at,
      score: a.score,
      caseTitle: a.cases.title,
      caseArea: a.cases.area,
      caseType: a.cases.type,
      scoreMode: a.cases.score_mode,
      safetyGate: a.cases.safety_gate,
      outcome: a.cases.ground_truth.outcome,
    })
  );

  const m = computePersonalMetrics(attempts);

  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Seu painel</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {m.totalAttempts} tentativa{m.totalAttempts === 1 ? '' : 's'} concluída
          {m.totalAttempts === 1 ? '' : 's'}
        </p>

        {/* Falhas de portão: lista em destaque, nunca média (§5.5) */}
        {m.safetyFailures.length > 0 && (
          <section className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4">
            <h2 className="font-semibold text-red-900">
              ⚠ Falhas de portão de segurança
            </h2>
            <p className="mt-1 text-xs text-red-700">
              Nestes casos você terminou confiante demais num quadro que não era
              para tratar. Isso é falha, não nota baixa.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-900">
              {m.safetyFailures.map((f) => (
                <li key={f.id}>
                  <strong>{f.caseTitle}</strong> — confiança final{' '}
                  {f.score.finalConfidence}%
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-400">Brier global</p>
            {m.brierGlobal !== null ? (
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {m.brierGlobal.toFixed(3)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">
                amostra insuficiente — ainda é ruído
                <span className="mt-1 block text-xs text-zinc-400">
                  ({attempts.filter((a) => a.scoreMode === 'outcome').length}/
                  {MIN_ATTEMPTS_FOR_AGGREGATES} tentativas)
                </span>
              </p>
            )}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-400">Índice de ancoragem</p>
            {m.anchoringIndex !== null ? (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {(m.anchoringIndex * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-zinc-400">
                  {m.totalAnchoringFlags} de {m.totalDiscriminativeStages} etapas
                  discriminativas sem revisão
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">sem dados ainda</p>
            )}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-400">Portão de segurança</p>
            <p
              className={`mt-1 text-2xl font-bold ${m.safetyFailures.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}
            >
              {m.safetyFailures.length} falha{m.safetyFailures.length === 1 ? '' : 's'}
            </p>
          </div>
        </section>

        {m.brierOverTime.length > 1 && (
          <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="font-semibold">Brier ao longo do tempo</h2>
            <p className="text-xs text-zinc-400">
              O que importa é a tendência, não o valor absoluto.
            </p>
            <div className="mt-3">
              <BrierTimeline data={m.brierOverTime} />
            </div>
          </section>
        )}

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Curva de calibração</h2>
          {m.calibration ? (
            <div className="mt-3">
              <CalibrationChart buckets={m.calibration} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              Amostra insuficiente — ainda é ruído. A curva aparece com{' '}
              {MIN_ATTEMPTS_FOR_AGGREGATES} tentativas pontuadas por desfecho.
            </p>
          )}
        </section>

        {m.totalAttempts > 0 && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="font-semibold">Por área</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {m.byArea.map((g) => (
                  <li key={g.key} className="flex justify-between">
                    <span className="capitalize">{g.key}</span>
                    <span className="tabular-nums text-zinc-500">
                      {g.attempts} caso{g.attempts > 1 ? 's' : ''}
                      {g.meanBrier !== null && ` · Brier ${g.meanBrier.toFixed(3)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="font-semibold">Por tipo de caso</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {m.byType.map((g) => (
                  <li key={g.key} className="flex justify-between">
                    <span>{TYPE_LABEL[g.key] ?? g.key}</span>
                    <span className="tabular-nums text-zinc-500">
                      {g.attempts} caso{g.attempts > 1 ? 's' : ''}
                      {g.meanBrier !== null && ` · Brier ${g.meanBrier.toFixed(3)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
