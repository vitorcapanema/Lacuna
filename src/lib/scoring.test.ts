import { describe, expect, it } from 'vitest';
import {
  brierScore,
  computeAttemptScore,
  computeVerdict,
  countAnchoringFlags,
  referenceDeviation,
  safetyPassed,
  ScorableCase,
} from './scoring';
import { validateCaseImport } from './case-schema';

const baseCase: ScorableCase = {
  scoreMode: 'outcome',
  safetyGate: false,
  groundTruth: { outcome: false },
  stages: [
    { order: 1, referenceConfidence: 70, discriminative: false },
    { order: 2, referenceConfidence: 45, discriminative: true, expectedShift: 'down' },
    { order: 3, referenceConfidence: 25, discriminative: true, expectedShift: 'down' },
    { order: 4, referenceConfidence: 10, discriminative: false },
  ],
};

describe('brierScore (§5.1)', () => {
  it('é 0 para confiança perfeita', () => {
    expect(brierScore(100, true)).toBe(0);
    expect(brierScore(0, false)).toBe(0);
  });

  it('é 1 para erro máximo com confiança máxima', () => {
    expect(brierScore(100, false)).toBe(1);
  });

  it('usa apenas a confiança final', () => {
    expect(brierScore(30, false)).toBeCloseTo(0.09);
  });
});

describe('referenceDeviation (§5.3)', () => {
  it('é 0 quando a trajetória bate com a referência', () => {
    const commits = [
      { stageOrder: 1, confidence: 70 },
      { stageOrder: 2, confidence: 45 },
      { stageOrder: 3, confidence: 25 },
      { stageOrder: 4, confidence: 10 },
    ];
    expect(referenceDeviation(baseCase.stages, commits)).toBe(0);
  });

  it('calcula o erro médio absoluto', () => {
    const commits = [
      { stageOrder: 1, confidence: 80 }, // +10
      { stageOrder: 2, confidence: 65 }, // +20
      { stageOrder: 3, confidence: 45 }, // +20
      { stageOrder: 4, confidence: 20 }, // +10
    ];
    expect(referenceDeviation(baseCase.stages, commits)).toBe(15);
  });
});

describe('countAnchoringFlags (§5.4)', () => {
  it('não flagra quem revisa quando a evidência manda', () => {
    const commits = [
      { stageOrder: 1, confidence: 75 },
      { stageOrder: 2, confidence: 55 }, // -20 (>= 15) ok
      { stageOrder: 3, confidence: 30 }, // -25 ok
      { stageOrder: 4, confidence: 20 },
    ];
    expect(countAnchoringFlags(baseCase.stages, commits)).toEqual({
      anchoringFlags: 0,
      discriminativeStages: 2,
    });
  });

  it('flagra quem trava a confiança em etapa discriminativa', () => {
    const commits = [
      { stageOrder: 1, confidence: 80 },
      { stageOrder: 2, confidence: 78 }, // -2: ancorou
      { stageOrder: 3, confidence: 75 }, // -3: ancorou
      { stageOrder: 4, confidence: 75 },
    ];
    expect(countAnchoringFlags(baseCase.stages, commits)).toEqual({
      anchoringFlags: 2,
      discriminativeStages: 2,
    });
  });

  it('flagra movimento na direção errada', () => {
    const commits = [
      { stageOrder: 1, confidence: 60 },
      { stageOrder: 2, confidence: 80 }, // subiu quando devia descer
      { stageOrder: 3, confidence: 40 }, // -40 ok
      { stageOrder: 4, confidence: 30 },
    ];
    expect(countAnchoringFlags(baseCase.stages, commits).anchoringFlags).toBe(1);
  });

  it('respeita minShift customizado', () => {
    const stages = [
      { order: 1, referenceConfidence: 60, discriminative: false },
      {
        order: 2,
        referenceConfidence: 40,
        discriminative: true,
        expectedShift: 'down' as const,
        minShift: 30,
      },
      { order: 3, referenceConfidence: 30, discriminative: false },
    ];
    const commits = [
      { stageOrder: 1, confidence: 70 },
      { stageOrder: 2, confidence: 50 }, // -20 < 30 exigidos
      { stageOrder: 3, confidence: 45 },
    ];
    expect(countAnchoringFlags(stages, commits).anchoringFlags).toBe(1);
  });
});

describe('safetyPassed (§5.5)', () => {
  it('usa 40 como limite default', () => {
    expect(safetyPassed(40)).toBe(true);
    expect(safetyPassed(41)).toBe(false);
  });

  it('respeita limite customizado', () => {
    expect(safetyPassed(55, 60)).toBe(true);
    expect(safetyPassed(65, 60)).toBe(false);
  });
});

describe('computeAttemptScore', () => {
  it('pontua uma tentativa outcome completa', () => {
    const commits = [
      { stageOrder: 1, confidence: 75 },
      { stageOrder: 2, confidence: 50 },
      { stageOrder: 3, confidence: 25 },
      { stageOrder: 4, confidence: 15 },
    ];
    const score = computeAttemptScore(baseCase, commits);
    expect(score.brier).toBeCloseTo(0.0225);
    expect(score.anchoringFlags).toBe(0);
    expect(score.safetyPassed).toBeNull();
    expect(score.finalConfidence).toBe(15);
  });

  it('brier é null em scoreMode reference (§5.3)', () => {
    const ambiguous: ScorableCase = { ...baseCase, scoreMode: 'reference' };
    const commits = [
      { stageOrder: 1, confidence: 70 },
      { stageOrder: 2, confidence: 45 },
      { stageOrder: 3, confidence: 25 },
      { stageOrder: 4, confidence: 10 },
    ];
    const score = computeAttemptScore(ambiguous, commits);
    expect(score.brier).toBeNull();
    expect(score.referenceDeviation).toBe(0);
  });

  it('avalia portão de segurança em caso impostor', () => {
    const impostor: ScorableCase = {
      ...baseCase,
      safetyGate: true,
      groundTruth: { outcome: false },
    };
    const failing = computeAttemptScore(impostor, [
      { stageOrder: 1, confidence: 80 },
      { stageOrder: 2, confidence: 60 },
      { stageOrder: 3, confidence: 45 },
      { stageOrder: 4, confidence: 45 },
    ]);
    expect(failing.safetyPassed).toBe(false);

    const passing = computeAttemptScore(impostor, [
      { stageOrder: 1, confidence: 80 },
      { stageOrder: 2, confidence: 55 },
      { stageOrder: 3, confidence: 30 },
      { stageOrder: 4, confidence: 20 },
    ]);
    expect(passing.safetyPassed).toBe(true);
  });
});

describe('computeVerdict (§6.2)', () => {
  it('falha de portão tem precedência', () => {
    const impostor: ScorableCase = { ...baseCase, safetyGate: true };
    const commits = [
      { stageOrder: 1, confidence: 80 },
      { stageOrder: 2, confidence: 78 },
      { stageOrder: 3, confidence: 75 },
      { stageOrder: 4, confidence: 70 },
    ];
    const score = computeAttemptScore(impostor, commits);
    expect(computeVerdict(impostor, commits, score).kind).toBe('falha_portao');
  });

  it('aponta as etapas em que houve ancoragem', () => {
    const commits = [
      { stageOrder: 1, confidence: 80 },
      { stageOrder: 2, confidence: 78 },
      { stageOrder: 3, confidence: 40 },
      { stageOrder: 4, confidence: 30 },
    ];
    const score = computeAttemptScore(baseCase, commits);
    const verdict = computeVerdict(baseCase, commits, score);
    expect(verdict.kind).toBe('ancoragem');
    if (verdict.kind === 'ancoragem') {
      expect(verdict.stages).toEqual([2]);
    }
  });

  it('reconhece revisão exemplar', () => {
    const commits = [
      { stageOrder: 1, confidence: 70 },
      { stageOrder: 2, confidence: 45 },
      { stageOrder: 3, confidence: 20 },
      { stageOrder: 4, confidence: 10 },
    ];
    const score = computeAttemptScore(baseCase, commits);
    expect(computeVerdict(baseCase, commits, score).kind).toBe('exemplar');
  });
});

describe('validateCaseImport (§7)', () => {
  const validCase = {
    title: 'Ombro · mulher 58a · dor escapular',
    area: 'ombro',
    type: 'padrao',
    difficulty: 2,
    claim: 'Este quadro é primariamente musculoesquelético',
    stages: [
      { order: 1, label: 'Apresentação', content: 'x', referenceConfidence: 70, discriminative: false },
      { order: 2, label: 'Exame físico', content: 'x', referenceConfidence: 45, discriminative: true, expectedShift: 'down' },
      { order: 3, label: 'Evolução', content: 'x', referenceConfidence: 25, discriminative: false },
    ],
    groundTruth: { outcome: false, source: 'desfecho_verificado', explanation: 'x' },
    scoreMode: 'outcome',
    safetyGate: false,
    teaching: { lesson: 'x' },
  };

  it('aceita caso válido', () => {
    expect(validateCaseImport(validCase).ok).toBe(true);
  });

  it('rejeita menos de 3 etapas', () => {
    const result = validateCaseImport({ ...validCase, stages: validCase.stages.slice(0, 2) });
    expect(result.ok).toBe(false);
  });

  it('rejeita etapa discriminativa sem expectedShift', () => {
    const stages = validCase.stages.map((s) =>
      s.order === 2 ? { ...s, expectedShift: undefined } : s
    );
    expect(validateCaseImport({ ...validCase, stages }).ok).toBe(false);
  });

  it('rejeita caso sem nenhuma etapa discriminativa', () => {
    const stages = validCase.stages.map((s) => ({ ...s, discriminative: false, expectedShift: undefined }));
    expect(validateCaseImport({ ...validCase, stages }).ok).toBe(false);
  });

  it("exige scoreMode 'reference' para tipo ambiguo", () => {
    expect(validateCaseImport({ ...validCase, type: 'ambiguo' }).ok).toBe(false);
    expect(
      validateCaseImport({ ...validCase, type: 'ambiguo', scoreMode: 'reference' }).ok
    ).toBe(true);
  });

  it("exige safetyGate para tipo impostor", () => {
    expect(validateCaseImport({ ...validCase, type: 'impostor' }).ok).toBe(false);
    expect(
      validateCaseImport({ ...validCase, type: 'impostor', safetyGate: true }).ok
    ).toBe(true);
  });
});
