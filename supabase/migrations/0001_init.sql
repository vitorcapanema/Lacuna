-- Banco de Casos Lacuna — schema inicial
--
-- Decisão de segurança central (SPEC §3 e §8): o conteúdo de etapas futuras,
-- o desfecho (ground_truth) e a lição NUNCA podem chegar ao cliente antes da
-- hora. Por isso, NENHUMA tabela de conteúdo tem policy de SELECT para o
-- cliente: todo acesso a cases/stages/attempts/commits passa pelo servidor
-- Next.js (service role), que decide o que entra no payload. RLS fica ligado
-- em tudo como cinto de segurança — sem policy, sem acesso direto.

-- ============================================================
-- Perfis
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'mentee' check (role in ('mentee', 'mentor', 'admin')),
  mentor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Casos e etapas
-- ============================================================
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text not null,
  type text not null check (type in ('padrao', 'variacao', 'impostor', 'armadilha', 'ambiguo')),
  difficulty int not null check (difficulty between 1 and 5),
  claim text not null,
  ground_truth jsonb not null, -- { outcome, source, explanation }
  score_mode text not null check (score_mode in ('outcome', 'reference')),
  safety_gate boolean not null default false,
  safety_threshold int check (safety_threshold between 0 and 100),
  teaching jsonb not null, -- { pathology?, lesson }
  published boolean not null default false,
  author_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),

  -- Validações da SPEC §7 também no banco
  constraint ambiguo_usa_reference check (type <> 'ambiguo' or score_mode = 'reference'),
  constraint impostor_tem_safety_gate check (type <> 'impostor' or safety_gate = true)
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  stage_order int not null check (stage_order >= 1),
  label text not null,
  content text not null,
  reference_confidence int not null check (reference_confidence between 0 and 100),
  discriminative boolean not null default false,
  expected_shift text check (expected_shift in ('down', 'up')),
  min_shift int check (min_shift between 1 and 100),
  debrief text,
  unique (case_id, stage_order),
  constraint discriminativa_tem_shift check (not discriminative or expected_shift is not null)
);

-- ============================================================
-- Tentativas e commits
-- ============================================================
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score jsonb
);

create index attempts_user_idx on public.attempts (user_id, started_at desc);

create table public.commits (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  stage_order int not null check (stage_order >= 1),
  confidence int not null check (confidence between 0 and 100),
  committed_at timestamptz not null default now(), -- timestamp do SERVIDOR (§3)
  time_spent_ms int not null default 0 check (time_spent_ms >= 0),
  unique (attempt_id, stage_order)
);

-- Mecanismo inviolável (§3): commit é imutável. Sem update, sem delete.
create or replace function public.forbid_commit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Commits de confiança são imutáveis (SPEC §3).';
end;
$$;

create trigger commits_immutable
  before update or delete on public.commits
  for each row execute function public.forbid_commit_mutation();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.stages enable row level security;
alter table public.attempts enable row level security;
alter table public.commits enable row level security;

-- Perfis: o usuário lê e edita o próprio perfil (nunca o próprio role).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- cases / stages / attempts / commits: SEM policies de cliente, de propósito.
-- Todo acesso passa pelo servidor (service role), que:
--   * nunca envia etapa futura antes do commit da atual;
--   * nunca envia ground_truth/teaching antes da tentativa concluir;
--   * grava commits com timestamp do servidor.
