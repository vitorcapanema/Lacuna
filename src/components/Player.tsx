'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface CommittedStage {
  order: number;
  label: string;
  content: string;
  confidence: number;
}

interface ActiveStage {
  order: number;
  label: string;
  content: string;
}

interface AttemptState {
  attemptId: string;
  case: { id: string; title: string; area: string; claim: string; totalStages: number };
  committed: CommittedStage[];
  active: ActiveStage | null;
  sliderStart: number;
  lockedCount: number;
  completed: boolean;
}

export default function Player({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [state, setState] = useState<AttemptState | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const stageShownAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/attempts/${attemptId}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? 'Falha ao carregar tentativa.');
        return;
      }
      if (data.completed) {
        router.replace(`/debrief/${attemptId}`);
        return;
      }
      setState(data);
      setConfidence(data.sliderStart);
      stageShownAt.current = Date.now();
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  async function commit() {
    if (!state?.active) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageOrder: state.active.order,
          confidence,
          timeSpentMs: Date.now() - stageShownAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha no commit.');

      if (data.completed) {
        router.push(`/debrief/${attemptId}`);
        return;
      }

      // A etapa seguinte veio na resposta do commit — nunca no payload inicial.
      setState((prev) =>
        prev
          ? {
              ...prev,
              committed: [
                ...prev.committed,
                { ...prev.active!, confidence },
              ],
              active: data.nextStage,
              lockedCount: Math.max(0, prev.lockedCount - 1),
            }
          : prev
      );
      // O slider permanece no valor commitado: revisão explícita, não
      // reentrada do zero (§6.1).
      stageShownAt.current = Date.now();
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no commit.');
      setBusy(false);
    }
  }

  if (error && !state) {
    return <p className="p-8 text-sm text-red-600">{error}</p>;
  }
  if (!state) {
    return <p className="p-8 text-sm text-zinc-400">Carregando caso…</p>;
  }

  const currentStageNumber = state.active?.order ?? state.case.totalStages;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">{state.case.title}</h1>
        <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          Etapa {currentStageNumber}/{state.case.totalStages}
        </span>
      </div>

      <ol className="mt-6 space-y-3">
        {/* Etapas commitadas: visíveis, colapsadas, imutáveis. Sem editar. */}
        {state.committed.map((s) => (
          <li key={s.order} className="rounded-lg border border-zinc-200 bg-white">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setExpanded(expanded === s.order ? null : s.order)}
            >
              <span className="text-sm font-medium text-zinc-500">
                ETAPA {s.order} — {s.label}
              </span>
              <span className="text-sm font-semibold text-emerald-700">
                ✓ {s.confidence}%
              </span>
            </button>
            {expanded === s.order && (
              <div className="prose-case border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
                <ReactMarkdown>{s.content}</ReactMarkdown>
              </div>
            )}
          </li>
        ))}

        {/* Etapa ativa */}
        {state.active && (
          <li className="rounded-lg border-2 border-emerald-500 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">
              ETAPA {state.active.order} — {state.active.label}
            </p>
            <div className="prose-case mt-3 rounded-md bg-zinc-50 p-3 text-sm">
              <ReactMarkdown>{state.active.content}</ReactMarkdown>
            </div>

            <div className="mt-5 rounded-md border border-zinc-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Claim
              </p>
              <p className="mt-1 text-sm font-medium">“{state.case.claim}”</p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Sua confiança:</span>
                <span className="text-xl font-bold tabular-nums">{confidence}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>0% — claim falsa</span>
                <span>100% — claim verdadeira</span>
              </div>
            </div>

            <button
              onClick={commit}
              disabled={busy}
              className="mt-5 w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Travando…' : 'Travar e avançar'}
            </button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              Depois de travar, não dá para voltar. É esse o ponto.
            </p>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </li>
        )}

        {/* Etapas futuras: bloqueadas — o conteúdo nem chegou ao navegador */}
        {Array.from({ length: state.lockedCount }, (_, i) => {
          const order = (state.active?.order ?? state.committed.length) + i + 1;
          return (
            <li
              key={`locked-${order}`}
              className="rounded-lg border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400"
            >
              ETAPA {order} — 🔒 bloqueada
            </li>
          );
        })}
      </ol>
    </div>
  );
}
