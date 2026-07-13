import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Client com a sessão do usuário (cookies). Usado para autenticação. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component — o middleware renova a sessão.
          }
        },
      },
    }
  );
}

/**
 * Client administrativo (service role). NUNCA importe em código de cliente.
 * Todo acesso a cases/stages/attempts/commits passa por aqui, porque essas
 * tabelas não têm policies de leitura para o cliente (ver migration 0001).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Usuário autenticado da requisição atual, ou null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'mentee' | 'mentor' | 'admin';
  mentor_id: string | null;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, email, name, role, mentor_id')
    .eq('id', user.id)
    .single();
  return (data as Profile) ?? null;
}
