import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthUser } from '@/lib/supabase/server';
import { getAttempt, getCase, getCommits, getStages, toScorableCase } from '@/lib/db';
import { computeVerdict } from '@/lib/scoring';
import { AttemptScore, DEFAULT_SAFETY_THRESHOLD } from '@/lib/types';

// Debrief (SPEC §6.2). Ground truth, referências e lições só saem do servidor
// DEPOIS que a tentativa está concluída — antes disso, spoiler é vazamento.
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
  if (!attempt.completed_at || !attempt.score) {
    return NextResponse.json(
      { error: 'Debrief disponível apenas após o último commit.' },
      { status: 403 }
    );
  }

  const [caseRow, stages, commits] = await Promise.all([
    getCase(admin, attempt.case_id),
    getStages(admin, attempt.case_id),
    getCommits(admin, id),
  ]);
  if (!caseRow) {
    return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 });
  }

  const score = attempt.score as unknown as AttemptScore;
  const scorable = toScorableCase(caseRow, stages);
  const plainCommits = commits.map((c) => ({
    stageOrder: c.stage_order,
    confidence: c.confidence,
    timeSpentMs: c.time_spent_ms,
  }));
  const verdict = computeVerdict(scorable, plainCommits, score);

  return NextResponse.json({
    case: {
      id: caseRow.id,
      title: caseRow.title,
      area: caseRow.area,
      type: caseRow.type,
      claim: caseRow.claim,
      scoreMode: caseRow.score_mode,
      safetyGate: caseRow.safety_gate,
      safetyThreshold: caseRow.safety_threshold ?? DEFAULT_SAFETY_THRESHOLD,
      groundTruth: caseRow.ground_truth,
      teaching: caseRow.teaching,
    },
    stages: stages.map((s) => ({
      order: s.stage_order,
      label: s.label,
      referenceConfidence: s.reference_confidence,
      discriminative: s.discriminative,
      expectedShift: s.expected_shift,
      minShift: s.min_shift,
      debrief: s.debrief,
    })),
    commits: plainCommits,
    score,
    verdict,
  });
}
