import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getProfile } from '@/lib/supabase/server';
import { validateCaseImport } from '@/lib/case-schema';
import { insertCase } from '@/lib/db';

// Import de casos por JSON (SPEC §7, via 1). Restrito a mentor/admin.
export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (profile.role !== 'mentor' && profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Apenas mentores e admins podem importar casos.' },
      { status: 403 }
    );
  }

  const payload = await request.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const validation = validateCaseImport(payload);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 422 });
  }

  const admin = createAdminClient();
  const imported: { id: string; title: string }[] = [];

  for (const caseData of validation.cases) {
    const result = await insertCase(admin, caseData, profile.id);
    if ('error' in result) {
      return NextResponse.json(
        {
          errors: [`Falha ao importar "${caseData.title}": ${result.error}`],
          imported,
        },
        { status: 500 }
      );
    }
    imported.push({ id: result.id, title: caseData.title });
  }

  return NextResponse.json({ imported });
}
