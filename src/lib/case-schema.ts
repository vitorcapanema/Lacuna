// Validação de importação de casos (SPEC §7)

import { z } from 'zod';

const stageSchema = z.object({
  order: z.number().int().min(1),
  label: z.string().min(1),
  content: z.string().min(1),
  referenceConfidence: z.number().min(0).max(100),
  discriminative: z.boolean(),
  expectedShift: z.enum(['down', 'up']).optional(),
  minShift: z.number().min(1).max(100).optional(),
  debrief: z.string().optional(),
});

export const caseImportSchema = z
  .object({
    title: z.string().min(1),
    area: z.string().min(1),
    type: z.enum(['padrao', 'variacao', 'impostor', 'armadilha', 'ambiguo']),
    difficulty: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    claim: z.string().min(1),
    stages: z.array(stageSchema).min(3, 'O caso precisa de pelo menos 3 etapas.'),
    groundTruth: z.object({
      outcome: z.boolean(),
      source: z.enum(['desfecho_verificado', 'consenso_painel', 'diretriz']),
      explanation: z.string().min(1),
    }),
    scoreMode: z.enum(['outcome', 'reference']),
    safetyGate: z.boolean(),
    safetyThreshold: z.number().min(0).max(100).optional(),
    teaching: z.object({
      pathology: z
        .enum([
          'ancoragem',
          'vista_grossa',
          'confianca_excesso',
          'fixacao_funcional',
          'limite_dominio',
          'contexto',
        ])
        .optional(),
      lesson: z.string().min(1),
    }),
    published: z.boolean().optional().default(true),
  })
  .superRefine((c, ctx) => {
    // Etapas com ordem contígua 1..n
    const orders = c.stages.map((s) => s.order).sort((a, b) => a - b);
    const contiguous = orders.every((o, i) => o === i + 1);
    if (!contiguous) {
      ctx.addIssue({
        code: 'custom',
        path: ['stages'],
        message: 'As etapas devem ter order contíguo começando em 1 (1, 2, 3, ...).',
      });
    }

    // discriminative === true ⇒ expectedShift obrigatório
    c.stages.forEach((s, i) => {
      if (s.discriminative && !s.expectedShift) {
        ctx.addIssue({
          code: 'custom',
          path: ['stages', i, 'expectedShift'],
          message: `Etapa ${s.order} é discriminativa e precisa de expectedShift ('down' | 'up').`,
        });
      }
    });

    // Regra de ouro (§11): pelo menos uma etapa discriminativa
    if (!c.stages.some((s) => s.discriminative)) {
      ctx.addIssue({
        code: 'custom',
        path: ['stages'],
        message:
          'Todo caso precisa de pelo menos uma etapa discriminativa — sem ela é só um quiz de conhecimento.',
      });
    }

    // type 'ambiguo' ⇒ scoreMode 'reference'
    if (c.type === 'ambiguo' && c.scoreMode !== 'reference') {
      ctx.addIssue({
        code: 'custom',
        path: ['scoreMode'],
        message: "Casos do tipo 'ambiguo' devem usar scoreMode 'reference'.",
      });
    }

    // type 'impostor' ⇒ safetyGate true
    if (c.type === 'impostor' && !c.safetyGate) {
      ctx.addIssue({
        code: 'custom',
        path: ['safetyGate'],
        message: "Casos do tipo 'impostor' devem ter safetyGate: true.",
      });
    }
  });

export type CaseImport = z.infer<typeof caseImportSchema>;

/** Valida um payload de import (um caso ou uma lista de casos). */
export function validateCaseImport(payload: unknown):
  | { ok: true; cases: CaseImport[] }
  | { ok: false; errors: string[] } {
  const items = Array.isArray(payload) ? payload : [payload];
  const cases: CaseImport[] = [];
  const errors: string[] = [];

  items.forEach((item, index) => {
    const result = caseImportSchema.safeParse(item);
    if (result.success) {
      cases.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        const where = issue.path.length ? ` (${issue.path.join('.')})` : '';
        errors.push(`Caso ${index + 1}${where}: ${issue.message}`);
      }
    }
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, cases };
}
