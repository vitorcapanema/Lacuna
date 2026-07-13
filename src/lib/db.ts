// Acesso a dados via service role. Este módulo é a única porta de entrada
// para cases/stages/attempts/commits — o cliente não tem SELECT nessas
// tabelas (ver supabase/migrations/0001_init.sql).

import { SupabaseClient } from '@supabase/supabase-js';
import { CaseImport } from './case-schema';
import { ScorableCase } from './scoring';
import { CaseType, GroundTruth, ScoreMode, Teaching } from './types';

export interface CaseRow {
  id: string;
  title: string;
  area: string;
  type: CaseType;
  difficulty: number;
  claim: string;
  ground_truth: GroundTruth;
  score_mode: ScoreMode;
  safety_gate: boolean;
  safety_threshold: number | null;
  teaching: Teaching;
  published: boolean;
  author_id: string | null;
}

export interface StageRow {
  case_id: string;
  stage_order: number;
  label: string;
  content: string;
  reference_confidence: number;
  discriminative: boolean;
  expected_shift: 'down' | 'up' | null;
  min_shift: number | null;
  debrief: string | null;
}

export interface AttemptRow {
  id: string;
  user_id: string;
  case_id: string;
  started_at: string;
  completed_at: string | null;
  score: Record<string, unknown> | null;
}

export interface CommitRow {
  attempt_id: string;
  stage_order: number;
  confidence: number;
  committed_at: string;
  time_spent_ms: number;
}

export async function getCase(admin: SupabaseClient, caseId: string) {
  const { data, error } = await admin
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();
  if (error) return null;
  return data as CaseRow;
}

export async function getStages(admin: SupabaseClient, caseId: string) {
  const { data, error } = await admin
    .from('stages')
    .select('*')
    .eq('case_id', caseId)
    .order('stage_order', { ascending: true });
  if (error || !data) return [];
  return data as StageRow[];
}

export async function getAttempt(admin: SupabaseClient, attemptId: string) {
  const { data, error } = await admin
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .single();
  if (error) return null;
  return data as AttemptRow;
}

export async function getCommits(admin: SupabaseClient, attemptId: string) {
  const { data, error } = await admin
    .from('commits')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('stage_order', { ascending: true });
  if (error || !data) return [];
  return data as CommitRow[];
}

export function toScorableCase(caseRow: CaseRow, stages: StageRow[]): ScorableCase {
  return {
    scoreMode: caseRow.score_mode,
    safetyGate: caseRow.safety_gate,
    safetyThreshold: caseRow.safety_threshold ?? undefined,
    groundTruth: { outcome: caseRow.ground_truth.outcome },
    stages: stages.map((s) => ({
      order: s.stage_order,
      referenceConfidence: s.reference_confidence,
      discriminative: s.discriminative,
      expectedShift: s.expected_shift ?? undefined,
      minShift: s.min_shift ?? undefined,
    })),
  };
}

/** Insere um caso importado (com etapas), já validado pelo schema §7. */
export async function insertCase(
  admin: SupabaseClient,
  imported: CaseImport,
  authorId: string
): Promise<{ id: string } | { error: string }> {
  const { data: caseRow, error: caseError } = await admin
    .from('cases')
    .insert({
      title: imported.title,
      area: imported.area,
      type: imported.type,
      difficulty: imported.difficulty,
      claim: imported.claim,
      ground_truth: imported.groundTruth,
      score_mode: imported.scoreMode,
      safety_gate: imported.safetyGate,
      safety_threshold: imported.safetyThreshold ?? null,
      teaching: imported.teaching,
      published: imported.published,
      author_id: authorId,
    })
    .select('id')
    .single();

  if (caseError || !caseRow) {
    return { error: caseError?.message ?? 'Falha ao inserir caso.' };
  }

  const { error: stagesError } = await admin.from('stages').insert(
    imported.stages.map((s) => ({
      case_id: caseRow.id,
      stage_order: s.order,
      label: s.label,
      content: s.content,
      reference_confidence: s.referenceConfidence,
      discriminative: s.discriminative,
      expected_shift: s.expectedShift ?? null,
      min_shift: s.minShift ?? null,
      debrief: s.debrief ?? null,
    }))
  );

  if (stagesError) {
    await admin.from('cases').delete().eq('id', caseRow.id);
    return { error: stagesError.message };
  }

  return { id: caseRow.id };
}
