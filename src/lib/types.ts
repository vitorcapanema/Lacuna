// Modelo de dados do Banco de Casos Lacuna (SPEC §4)

export type CaseType = 'padrao' | 'variacao' | 'impostor' | 'armadilha' | 'ambiguo';
export type ScoreMode = 'outcome' | 'reference';
export type TruthSource = 'desfecho_verificado' | 'consenso_painel' | 'diretriz';
export type Pathology =
  | 'ancoragem'
  | 'vista_grossa'
  | 'confianca_excesso'
  | 'fixacao_funcional'
  | 'limite_dominio'
  | 'contexto';

export interface Stage {
  order: number; // 1..n
  label: string;
  content: string; // markdown — revelado NESTA etapa
  referenceConfidence: number; // 0-100, confiança calibrada ao fim da etapa
  discriminative: boolean;
  expectedShift?: 'down' | 'up'; // obrigatório se discriminative
  minShift?: number; // default 15
  debrief?: string;
}

export interface GroundTruth {
  outcome: boolean;
  source: TruthSource;
  explanation: string; // markdown
}

export interface Teaching {
  pathology?: Pathology;
  lesson: string; // markdown
}

export interface Case {
  id: string;
  title: string;
  area: string;
  type: CaseType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  claim: string; // proposição binária e verificável
  stages: Stage[];
  groundTruth: GroundTruth;
  scoreMode: ScoreMode;
  safetyGate: boolean;
  safetyThreshold?: number; // default 40
  teaching: Teaching;
  published: boolean;
  authorId: string;
  createdAt: Date;
}

export interface Commit {
  stageOrder: number;
  confidence: number; // 0-100
  committedAt: Date; // timestamp do servidor
  timeSpentMs: number;
}

export interface AttemptScore {
  brier: number | null; // null se scoreMode === 'reference'
  referenceDeviation: number | null; // erro médio absoluto vs trajetória de referência
  anchoringFlags: number; // etapas discriminativas em que não revisou
  discriminativeStages: number; // total de etapas discriminativas do caso
  safetyPassed: boolean | null; // null se não for safetyGate
  finalConfidence: number;
}

export interface Attempt {
  id: string;
  userId: string;
  caseId: string;
  startedAt: Date;
  completedAt?: Date;
  commits: Commit[];
  score?: AttemptScore;
}

export type Role = 'mentee' | 'mentor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  mentorId?: string;
  createdAt: Date;
}

export const DEFAULT_SAFETY_THRESHOLD = 40;
export const DEFAULT_MIN_SHIFT = 15;
export const INITIAL_SLIDER_VALUE = 50;
export const MIN_ATTEMPTS_FOR_AGGREGATES = 15;
