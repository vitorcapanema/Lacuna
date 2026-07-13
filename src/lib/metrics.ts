// Métricas agregadas do painel pessoal (SPEC §5.2, §6.3)

import { AttemptScore, MIN_ATTEMPTS_FOR_AGGREGATES } from './types';

export interface CompletedAttempt {
  id: string;
  completedAt: string;
  score: AttemptScore;
  caseTitle: string;
  caseArea: string;
  caseType: string;
  scoreMode: 'outcome' | 'reference';
  safetyGate: boolean;
  outcome: boolean;
}

export interface CalibrationBucket {
  label: string; // "0–20", ...
  declaredMid: number;
  attempts: number;
  hitRate: number | null; // proporção em que a claim era verdadeira
}

export interface PersonalMetrics {
  totalAttempts: number;
  enoughForAggregates: boolean; // §5.2: só com >= 15 tentativas
  brierGlobal: number | null;
  brierOverTime: { index: number; brier: number; date: string }[];
  anchoringIndex: number | null;
  totalAnchoringFlags: number;
  totalDiscriminativeStages: number;
  safetyFailures: CompletedAttempt[]; // lista, NUNCA média (§5.5)
  calibration: CalibrationBucket[] | null;
  byArea: { key: string; attempts: number; meanBrier: number | null }[];
  byType: { key: string; attempts: number; meanBrier: number | null }[];
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function computePersonalMetrics(attempts: CompletedAttempt[]): PersonalMetrics {
  const outcomeAttempts = attempts.filter(
    (a) => a.scoreMode === 'outcome' && a.score.brier !== null
  );
  const enough = outcomeAttempts.length >= MIN_ATTEMPTS_FOR_AGGREGATES;

  const totalFlags = attempts.reduce((n, a) => n + a.score.anchoringFlags, 0);
  const totalDiscriminative = attempts.reduce(
    (n, a) => n + (a.score.discriminativeStages ?? 0),
    0
  );

  const calibration: CalibrationBucket[] = [0, 20, 40, 60, 80].map((lo) => {
    const hi = lo + 20;
    const inBucket = outcomeAttempts.filter((a) => {
      const c = a.score.finalConfidence;
      return c >= lo && (hi === 100 ? c <= hi : c < hi);
    });
    return {
      label: `${lo}–${hi}`,
      declaredMid: lo + 10,
      attempts: inBucket.length,
      hitRate: inBucket.length
        ? inBucket.filter((a) => a.outcome).length / inBucket.length
        : null,
    };
  });

  function groupBy(key: (a: CompletedAttempt) => string) {
    const groups = new Map<string, CompletedAttempt[]>();
    for (const a of attempts) {
      const k = key(a);
      groups.set(k, [...(groups.get(k) ?? []), a]);
    }
    return [...groups.entries()].map(([k, list]) => ({
      key: k,
      attempts: list.length,
      meanBrier: mean(
        list.filter((a) => a.score.brier !== null).map((a) => a.score.brier as number)
      ),
    }));
  }

  return {
    totalAttempts: attempts.length,
    enoughForAggregates: enough,
    brierGlobal: enough
      ? mean(outcomeAttempts.map((a) => a.score.brier as number))
      : null,
    brierOverTime: outcomeAttempts
      .slice()
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .map((a, i) => ({
        index: i + 1,
        brier: a.score.brier as number,
        date: a.completedAt.slice(0, 10),
      })),
    anchoringIndex: totalDiscriminative > 0 ? totalFlags / totalDiscriminative : null,
    totalAnchoringFlags: totalFlags,
    totalDiscriminativeStages: totalDiscriminative,
    safetyFailures: attempts.filter(
      (a) => a.safetyGate && a.score.safetyPassed === false
    ),
    calibration: enough ? calibration : null,
    byArea: groupBy((a) => a.caseArea),
    byType: groupBy((a) => a.caseType),
  };
}
