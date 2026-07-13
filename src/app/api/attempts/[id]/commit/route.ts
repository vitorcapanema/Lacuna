import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthUser } from '@/lib/supabase/server';
import { getAttempt, getCase, getCommits, getStages, toScorableCase } from '@/lib/db';
import { computeAttemptScore } from '@/lib/scoring';

// Commit de confiança (SPEC §3):
//  * persistido no servidor com timestamp do servidor;
//  * imutável (trigger no banco rejeita UPDATE/DELETE);
//  * a etapa seguinte só é revelada DEPOIS do commit — e é este endpoint
//    que a entrega, nunca o payload inicial.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const confidence = body?.confidence;
  const stageOrder = body?.stageOrder;
  const timeSpentMs = Number.isFinite(body?.timeSpentMs)
    ? Math.max(0, Math.round(body.timeSpentMs))
    : 0;

  if (
    !Number.isInteger(confidence) ||
    confidence < 0 ||
    confidence > 100 ||
    !Number.isInteger(stageOrder)
  ) {
    return NextResponse.json(
      { error: 'confidence (0-100, inteiro) e stageOrder são obrigatórios.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const attempt = await getAttempt(admin, id);
  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Tentativa não encontrada.' }, { status: 404 });
  }
  if (attempt.completed_at) {
    return NextResponse.json({ error: 'Tentativa já concluída.' }, { status: 409 });
  }

  const [stages, commits] = await Promise.all([
    getStages(admin, attempt.case_id),
    getCommits(admin, id),
  ]);

  // A etapa a commitar é derivada do servidor, não do cliente. O stageOrder
  // do body serve apenas para detectar cliente dessincronizado.
  const expectedOrder = commits.length + 1;
  if (stageOrder !== expectedOrder || expectedOrder > stages.length) {
    return NextResponse.json(
      { error: `Etapa fora de ordem. Etapa atual: ${expectedOrder}.` },
      { status: 409 }
    );
  }

  const { error: insertError } = await admin.from('commits').insert({
    attempt_id: id,
    stage_order: expectedOrder,
    confidence,
    time_spent_ms: timeSpentMs,
    // committed_at: default now() do banco — timestamp do servidor.
  });

  if (insertError) {
    // unique(attempt_id, stage_order) → commit duplicado/concorrente
    return NextResponse.json(
      { error: 'Esta etapa já foi commitada. Commits são imutáveis.' },
      { status: 409 }
    );
  }

  const isLastStage = expectedOrder === stages.length;

  if (!isLastStage) {
    const next = stages.find((s) => s.stage_order === expectedOrder + 1)!;
    return NextResponse.json({
      completed: false,
      nextStage: { order: next.stage_order, label: next.label, content: next.content },
    });
  }

  // Última etapa: pontua e conclui.
  const caseRow = await getCase(admin, attempt.case_id);
  if (!caseRow) {
    return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 });
  }

  const allCommits = [
    ...commits.map((c) => ({ stageOrder: c.stage_order, confidence: c.confidence })),
    { stageOrder: expectedOrder, confidence },
  ];
  const score = computeAttemptScore(toScorableCase(caseRow, stages), allCommits);

  const { error: updateError } = await admin
    .from('attempts')
    .update({ completed_at: new Date().toISOString(), score })
    .eq('id', id)
    .is('completed_at', null);

  if (updateError) {
    return NextResponse.json({ error: 'Falha ao concluir tentativa.' }, { status: 500 });
  }

  return NextResponse.json({ completed: true });
}
