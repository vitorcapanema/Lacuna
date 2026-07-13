'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import TrajectoryChart, { TrajectoryPoint } from './TrajectoryChart';

const SOURCE_LABEL: Record<string, string> = {
  desfecho_verificado: 'Desfecho verificado',
  consenso_painel: 'Consenso de painel',
  diretriz: 'Diretriz',
};

const PATHOLOGY_LABEL: Record<string, string> = {
  ancoragem: 'Ancoragem',
  vista_grossa: 'Vista grossa',
  confianca_excesso: 'Excesso de confiança',
  fixacao_funcional: 'Fixação funcional',
  limite_dominio: 'Limite de domínio',
  contexto: 'Contexto',
};

interface DebriefData {
  case: {
    id: string;
    title: string;
    area: string;
    type: string;
    claim: string;
    scoreMode: 'outcome' | 'reference';
    safetyGate: boolean;
    safetyThreshold: number;
    groundTruth: { outcome: boolean; source: string; explanation: string };
    teaching: { pathology?: string; lesson: string };
  };
  stages: {
    order: number;
    label: string;
    referenceConfidence: number;
    discriminative: boolean;
    expectedShift: 'down' | 'up' | null;
    minShift: number | null;
    debrief: string | null;
  }[];
  commits: { stageOrder: number; confidence: number; timeSpentMs: number }[];
  score: {
    brier: number | null;
    referenceDeviation: number | null;
    anchoringFlags: number;
    safetyPassed: boolean | null;
    finalConfidence: number;
  };
  verdict: { kind: string; message: string; stages?: number[] };
}

export default function Debrief({ attemptId }: { attemptId: string }) {
  const [data, setData] = useState<DebriefData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}/debrief`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Falha ao carregar debrief.');
        setData(body);
      })
      .catch((e) => setError(e.message));
  }, [attemptId]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="p-8 text-sm text-zinc-400">Carregando debrief…</p>;

  const confidenceByOrder = new Map(
    data.commits.map((c) => [c.stageOrder, c.confidence])
  );
  const chartData: TrajectoryPoint[] = data.stages.map((s) => ({
    name: `E${s.order}`,
    user: confidenceByOrder.get(s.order) ?? 0,
    ref: s.referenceConfidence,
    band: [
      Math.max(0, s.referenceConfidence - 15),
      Math.min(100, s.referenceConfidence + 15),
    ],
  }));

  const verdictStyle =
    data.verdict.kind === 'falha_portao'
      ? 'border-red-300 bg-red-50 text-red-900'
      : data.verdict.kind === 'ancoragem'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : data.verdict.kind === 'exemplar'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
          : 'border-zinc-300 bg-zinc-50 text-zinc-700';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Debrief
      </p>
      <h1 className="mt-1 text-lg font-bold">{data.case.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">“{data.case.claim}”</p>

      {/* 1. Desfecho verificado */}
      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Desfecho</h2>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {SOURCE_LABEL[data.case.groundTruth.source] ?? data.case.groundTruth.source}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium">
          A claim era{' '}
          <span
            className={
              data.case.groundTruth.outcome ? 'text-emerald-700' : 'text-red-700'
            }
          >
            {data.case.groundTruth.outcome ? 'VERDADEIRA' : 'FALSA'}
          </span>
          .
        </p>
        <div className="prose-case mt-2 text-sm text-zinc-600">
          <ReactMarkdown>{data.case.groundTruth.explanation}</ReactMarkdown>
        </div>
      </section>

      {/* 2. Trajetória */}
      <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold">Sua trajetória vs. referência</h2>
        <div className="mt-3">
          <TrajectoryChart data={chartData} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded bg-zinc-50 p-2">
            <dt className="text-xs text-zinc-400">Confiança final</dt>
            <dd className="font-semibold tabular-nums">{data.score.finalConfidence}%</dd>
          </div>
          {data.score.brier !== null && (
            <div className="rounded bg-zinc-50 p-2">
              <dt className="text-xs text-zinc-400">Brier</dt>
              <dd className="font-semibold tabular-nums">
                {data.score.brier.toFixed(3)}
              </dd>
            </div>
          )}
          {data.case.scoreMode === 'reference' &&
            data.score.referenceDeviation !== null && (
              <div className="rounded bg-zinc-50 p-2">
                <dt className="text-xs text-zinc-400">Desvio da referência</dt>
                <dd className="font-semibold tabular-nums">
                  {data.score.referenceDeviation.toFixed(1)} pts
                </dd>
              </div>
            )}
          <div className="rounded bg-zinc-50 p-2">
            <dt className="text-xs text-zinc-400">Ancoragens</dt>
            <dd className="font-semibold tabular-nums">{data.score.anchoringFlags}</dd>
          </div>
          {data.score.safetyPassed !== null && (
            <div className="rounded bg-zinc-50 p-2">
              <dt className="text-xs text-zinc-400">Portão de segurança</dt>
              <dd
                className={`font-semibold ${data.score.safetyPassed ? 'text-emerald-700' : 'text-red-700'}`}
              >
                {data.score.safetyPassed ? 'Passou' : 'FALHOU'}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* 3. Veredito */}
      <section className={`mt-4 rounded-lg border p-4 text-sm ${verdictStyle}`}>
        <ReactMarkdown>{`**Veredito.** ${data.verdict.message}`}</ReactMarkdown>
      </section>

      {/* 4. Debrief por etapa discriminativa */}
      {data.stages.some((s) => s.discriminative && s.debrief) && (
        <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Por que você deveria ter movido</h2>
          <ul className="mt-3 space-y-3">
            {data.stages
              .filter((s) => s.discriminative && s.debrief)
              .map((s) => {
                const user = confidenceByOrder.get(s.order);
                const prev = confidenceByOrder.get(s.order - 1) ?? 50;
                return (
                  <li key={s.order} className="rounded-md bg-zinc-50 p-3 text-sm">
                    <p className="font-medium">
                      Etapa {s.order} — {s.label}{' '}
                      <span className="ml-1 text-xs text-zinc-400">
                        esperado: {s.expectedShift === 'down' ? '↓' : '↑'} ≥
                        {s.minShift ?? 15} pts · você: {prev}% → {user}%
                      </span>
                    </p>
                    <div className="prose-case mt-1 text-zinc-600">
                      <ReactMarkdown>{s.debrief!}</ReactMarkdown>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {/* 5. A lição */}
      <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">A lição</h2>
          {data.case.teaching.pathology && (
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {PATHOLOGY_LABEL[data.case.teaching.pathology] ??
                data.case.teaching.pathology}
            </span>
          )}
        </div>
        <div className="prose-case mt-2 text-sm text-zinc-600">
          <ReactMarkdown>{data.case.teaching.lesson}</ReactMarkdown>
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
        >
          Voltar aos casos
        </Link>
        <Link
          href="/painel"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Ver meu painel
        </Link>
      </div>
    </div>
  );
}
