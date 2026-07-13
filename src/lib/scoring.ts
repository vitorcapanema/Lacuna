// Lógica de pontuação (SPEC §5)

import {
  AttemptScore,
  DEFAULT_MIN_SHIFT,
  DEFAULT_SAFETY_THRESHOLD,
  INITIAL_SLIDER_VALUE,
} from './types';

export interface ScorableStage {
  order: number;
  referenceConfidence: number;
  discriminative: boolean;
  expectedShift?: 'down' | 'up';
  minShift?: number;
}

export interface ScorableCase {
  scoreMode: 'outcome' | 'reference';
  safetyGate: boolean;
  safetyThreshold?: number;
  groundTruth: { outcome: boolean };
  stages: ScorableStage[];
}

export interface ScorableCommit {
  stageOrder: number;
  confidence: number;
}

/**
 * Escore de Brier sobre a confiança FINAL (§5.1).
 * Não é média por etapa: a decisão que importa é a última.
 */
export function brierScore(finalConfidence: number, outcome: boolean): number {
  const p = finalConfidence / 100;
  const o = outcome ? 1 : 0;
  return (p - o) ** 2;
}

/**
 * Erro médio absoluto contra a trajetória de referência (§5.3).
 */
export function referenceDeviation(
  stages: ScorableStage[],
  commits: ScorableCommit[]
): number {
  const byOrder = new Map(commits.map((c) => [c.stageOrder, c.confidence]));
  const diffs = stages.map((s) =>
    Math.abs((byOrder.get(s.order) ?? 0) - s.referenceConfidence)
  );
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

/**
 * Índice de ancoragem por tentativa (§5.4): em cada etapa discriminativa,
 * a confiança moveu na direção esperada com o deslocamento mínimo?
 */
export function countAnchoringFlags(
  stages: ScorableStage[],
  commits: ScorableCommit[]
): { anchoringFlags: number; discriminativeStages: number } {
  const byOrder = new Map(commits.map((c) => [c.stageOrder, c.confidence]));
  let anchoringFlags = 0;
  let discriminativeStages = 0;

  for (const stage of stages) {
    if (!stage.discriminative) continue;
    discriminativeStages++;

    const current = byOrder.get(stage.order);
    if (current === undefined) continue;
    // Na primeira etapa não há commit anterior: o slider parte de 50 (§6.1).
    const previous = byOrder.get(stage.order - 1) ?? INITIAL_SLIDER_VALUE;

    const delta = current - previous;
    const minShift = stage.minShift ?? DEFAULT_MIN_SHIFT;
    const moved =
      stage.expectedShift === 'down' ? delta <= -minShift : delta >= minShift;
    if (!moved) anchoringFlags++;
  }

  return { anchoringFlags, discriminativeStages };
}

/**
 * Portão de segurança (§5.5). Não é escala — é portão.
 */
export function safetyPassed(
  finalConfidence: number,
  safetyThreshold?: number
): boolean {
  return finalConfidence <= (safetyThreshold ?? DEFAULT_SAFETY_THRESHOLD);
}

/**
 * Pontuação completa de uma tentativa concluída.
 */
export function computeAttemptScore(
  caseData: ScorableCase,
  commits: ScorableCommit[]
): AttemptScore {
  if (commits.length === 0) {
    throw new Error('Tentativa sem commits não pode ser pontuada.');
  }
  const sorted = [...commits].sort((a, b) => a.stageOrder - b.stageOrder);
  const finalConfidence = sorted[sorted.length - 1].confidence;

  const { anchoringFlags, discriminativeStages } = countAnchoringFlags(
    caseData.stages,
    sorted
  );

  return {
    brier:
      caseData.scoreMode === 'outcome'
        ? brierScore(finalConfidence, caseData.groundTruth.outcome)
        : null,
    referenceDeviation: referenceDeviation(caseData.stages, sorted),
    anchoringFlags,
    discriminativeStages,
    safetyPassed: caseData.safetyGate
      ? safetyPassed(finalConfidence, caseData.safetyThreshold)
      : null,
    finalConfidence,
  };
}

export type Verdict =
  | { kind: 'falha_portao'; message: string }
  | { kind: 'ancoragem'; message: string; stages: number[] }
  | { kind: 'exemplar'; message: string }
  | { kind: 'neutro'; message: string };

/**
 * Veredito do debrief (§6.2).
 */
export function computeVerdict(
  caseData: ScorableCase,
  commits: ScorableCommit[],
  score: AttemptScore
): Verdict {
  if (caseData.safetyGate && score.safetyPassed === false) {
    return {
      kind: 'falha_portao',
      message: `Falha de portão. Você terminou com ${score.finalConfidence}% de confiança — acima do limite de ${caseData.safetyThreshold ?? DEFAULT_SAFETY_THRESHOLD}%. Você teria tratado em vez de encaminhar.`,
    };
  }

  if (score.anchoringFlags > 0) {
    const byOrder = new Map(commits.map((c) => [c.stageOrder, c.confidence]));
    const anchoredStages = caseData.stages
      .filter((s) => {
        if (!s.discriminative) return false;
        const current = byOrder.get(s.order);
        if (current === undefined) return true;
        const previous = byOrder.get(s.order - 1) ?? INITIAL_SLIDER_VALUE;
        const delta = current - previous;
        const minShift = s.minShift ?? DEFAULT_MIN_SHIFT;
        return !(s.expectedShift === 'down' ? delta <= -minShift : delta >= minShift);
      })
      .map((s) => s.order);

    return {
      kind: 'ancoragem',
      stages: anchoredStages,
      message: `Ancoragem. Você recebeu evidência contraditória na${anchoredStages.length > 1 ? 's' : ''} Etapa${anchoredStages.length > 1 ? 's' : ''} ${anchoredStages.join(', ')} e não moveu.`,
    };
  }

  const brierBaixo = score.brier !== null && score.brier <= 0.1;
  const aderente =
    score.referenceDeviation !== null && score.referenceDeviation <= 15;
  if ((caseData.scoreMode === 'outcome' && brierBaixo) || (caseData.scoreMode === 'reference' && aderente)) {
    return { kind: 'exemplar', message: 'Revisão exemplar. Você moveu quando a evidência mandou mover.' };
  }

  return {
    kind: 'neutro',
    message:
      'Você revisou quando a evidência chegou, mas a calibração final ficou distante. Compare sua trajetória com a banda de referência abaixo.',
  };
}
