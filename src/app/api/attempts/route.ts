import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthUser } from '@/lib/supabase/server';
import { getCase } from '@/lib/db';

// Inicia uma nova tentativa. Refazer um caso cria SEMPRE uma nova attempt,
// nunca sobrescreve a anterior (SPEC §3).
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const caseId = body?.caseId;
  if (typeof caseId !== 'string') {
    return NextResponse.json({ error: 'caseId obrigatório.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const caseRow = await getCase(admin, caseId);
  if (!caseRow || !caseRow.published) {
    return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 });
  }

  const { data: attempt, error } = await admin
    .from('attempts')
    .insert({ user_id: user.id, case_id: caseId })
    .select('id')
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: 'Falha ao iniciar tentativa.' }, { status: 500 });
  }

  return NextResponse.json({ attemptId: attempt.id });
}
