import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthUser } from '@/lib/supabase/server';
import { getAttempt, getCase, getCommits, getStages } from '@/lib/db';
import { INITIAL_SLIDER_VALUE } from '@/lib/types';

// Estado atual da tentativa. REGRA CENTRAL (SPEC §3): etapas futuras não
// entram no payload — só as commitadas e a ativa.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const attempt = await getAttempt(admin, id);
  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Tentativa não encontrada.' }, { status: 404 });
  }

  const [caseRow, stages, commits] = await Promise.all([
    getCase(admin, attempt.case_id),
    getStages(admin, attempt.case_id),
    getCommits(admin, id),
  ]);
  if (!caseRow) {
    return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 });
  }

  const stageByOrder = new Map(stages.map((s) => [s.stage_order, s]));
  const committed = commits.map((c) => {
    const stage = stageByOrder.get(c.stage_order);
    return {
      order: c.stage_order,
      label: stage?.label ?? `Etapa ${c.stage_order}`,
      content: stage?.content ?? '',
      confidence: c.confidence,
    };
  });

  const completed = attempt.completed_at !== null;
  const activeOrder = commits.length + 1;
  const activeStage =
    !completed && activeOrder <= stages.length
      ? stageByOrder.get(activeOrder) ?? null
      : null;

  return NextResponse.json({
    attemptId: attempt.id,
    case: {
      id: caseRow.id,
      title: caseRow.title,
      area: caseRow.area,
      claim: caseRow.claim,
      totalStages: stages.length,
    },
    committed,
    active: activeStage
      ? {
          order: activeStage.stage_order,
          label: activeStage.label,
          content: activeStage.content,
        }
      : null,
    // Slider parte da confiança anterior; 50 na primeira etapa (§6.1).
    sliderStart:
      commits.length > 0
        ? commits[commits.length - 1].confidence
        : INITIAL_SLIDER_VALUE,
    lockedCount: Math.max(0, stages.length - commits.length - (activeStage ? 1 : 0)),
    completed,
  });
}
