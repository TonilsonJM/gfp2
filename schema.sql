-- =====================================================================
-- Fin JM - Gestão Financeira Pessoal
-- Script completo do Supabase: tabelas, funções, triggers e RLS
-- Execute este ficheiro no SQL Editor do Supabase (projeto novo, plano free)
-- =====================================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. TABELA: profiles
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  plano text not null default 'FREE' check (plano in ('FREE', 'PRO')),
  is_admin boolean not null default false,
  limite_gasto_mensal numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 2. TABELA: wallets (carteiras)
-- =====================================================================
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  saldo_inicial numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 3. TABELA: categories (categorias)
-- user_id = null => categoria padrão do sistema (visível a todos)
-- =====================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  cor text default '#10B981',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 4. TABELA: transactions (transações)
-- eh_transferencia + transferencia_grupo_id: usados na função "Transferir
-- entre Carteiras" (duas transações ligadas que não contam como
-- gasto/receita real nos gráficos e indicadores do Dashboard)
-- =====================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  descricao text,
  eh_transferencia boolean not null default false,
  transferencia_grupo_id uuid,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 5. TABELA: goals (metas)
-- contribuicao_mensal + ultimo_mes_contribuicao: usados na "contribuição
-- automática" (a app soma o valor sozinha uma vez por mês)
-- =====================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  nome text not null,
  valor_alvo numeric(14,2) not null check (valor_alvo > 0),
  valor_atual numeric(14,2) not null default 0,
  data_limite date,
  contribuicao_mensal numeric(14,2),
  ultimo_mes_contribuicao date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 6. TABELA: wallet_members (partilha de carteiras / carteiras em grupo)
-- =====================================================================
create table if not exists public.wallet_members (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  convidado_email text not null,
  papel text not null default 'editor' check (papel in ('editor', 'visualizador')),
  status text not null default 'pendente' check (status in ('pendente', 'aceite')),
  created_at timestamptz not null default now(),
  unique (wallet_id, convidado_email)
);

-- =====================================================================
-- 7. TABELA: recurring_transactions (transações recorrentes)
-- =====================================================================
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(14,2) not null check (valor > 0),
  descricao text,
  dia_do_mes int not null check (dia_do_mes between 1 and 28),
  ativo boolean not null default true,
  ultimo_lancamento date,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 8. TABELA: plan_history (histórico de mudanças de plano - Admin)
-- =====================================================================
create table if not exists public.plan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plano_anterior text,
  plano_novo text not null,
  alterado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 9. TABELA: push_subscriptions (notificações push do PWA)
-- =====================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists idx_wallets_user on public.wallets(user_id);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_wallet on public.transactions(wallet_id);
create index if not exists idx_transactions_data on public.transactions(data);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_wallet_members_wallet on public.wallet_members(wallet_id);
create index if not exists idx_wallet_members_email on public.wallet_members(convidado_email);
create index if not exists idx_recurring_wallet on public.recurring_transactions(wallet_id);
create index if not exists idx_plan_history_user on public.plan_history(user_id);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- =====================================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER evita recursão nas policies)
-- =====================================================================

-- Gera um username válido e único a partir do e-mail (usado quando o
-- utilizador não escolhe um, ou escolhe um inválido/já usado)
create or replace function public.gerar_username_a_partir_do_email(p_email text)
returns text
language plpgsql
security definer
as $$
declare
  base text;
  candidato text;
  sufixo int := 0;
begin
  base := regexp_replace(lower(split_part(p_email, '@', 1)), '[^a-z0-9_]', '', 'g');
  if length(base) < 3 then
    base := base || substr(md5(random()::text), 1, 3);
  end if;
  base := substr(base, 1, 20);
  candidato := base;
  while exists (select 1 from public.profiles where username = candidato) loop
    sufixo := sufixo + 1;
    candidato := substr(base, 1, greatest(1, 20 - length(sufixo::text) - 1)) || '_' || sufixo;
  end loop;
  return candidato;
end;
$$;

-- Devolve o e-mail associado a um username (usado no login por username e
-- no convite de membros de carteira por username). Devolve null se não
-- existir, sem expor mais nenhum dado do perfil.
create or replace function public.obter_email_por_username(p_username text)
returns text
language sql
security definer
stable
as $$
  select email from public.profiles where username = lower(p_username);
$$;

grant execute on function public.obter_email_por_username(text) to anon, authenticated;

-- Verifica se um utilizador é Super Admin
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- Verifica se um utilizador é PRO
create or replace function public.is_pro(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select plano = 'PRO' from public.profiles where id = uid), false);
$$;

-- Verifica se um utilizador é dono de uma carteira
create or replace function public.is_wallet_owner(p_wallet_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.wallets w where w.id = p_wallet_id and w.user_id = p_uid
  );
$$;

-- Verifica se um utilizador tem acesso de leitura a uma carteira
-- (é o dono OU é membro aceite, qualquer papel)
create or replace function public.has_wallet_access(p_wallet_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select public.is_wallet_owner(p_wallet_id, p_uid) or exists (
    select 1 from public.wallet_members m
    where m.wallet_id = p_wallet_id and m.user_id = p_uid and m.status = 'aceite'
  );
$$;

-- Verifica se um utilizador pode editar/lançar em uma carteira
-- (é o dono OU é membro aceite com papel "editor")
create or replace function public.can_edit_wallet(p_wallet_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select public.is_wallet_owner(p_wallet_id, p_uid) or exists (
    select 1 from public.wallet_members m
    where m.wallet_id = p_wallet_id and m.user_id = p_uid
      and m.status = 'aceite' and m.papel = 'editor'
  );
$$;

-- Liga convites pendentes ao utilizador atual, comparando pelo e-mail
-- de login (chamada pela app logo após o login)
create or replace function public.aceitar_convites_pendentes()
returns void
language plpgsql
security definer
as $$
begin
  update public.wallet_members
  set user_id = auth.uid(), status = 'aceite'
  where lower(convidado_email) = lower(auth.email()) and user_id is null;
end;
$$;

-- =====================================================================
-- TRIGGER: criar profile automaticamente ao registar novo utilizador
-- O e-mail tonilsonjm@gmail.com é criado já como Super Admin
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if v_username !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from public.profiles where username = v_username) then
    v_username := public.gerar_username_a_partir_do_email(new.email);
  end if;

  insert into public.profiles (id, nome, email, username, plano, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    v_username,
    'FREE',
    (lower(new.email) = 'tonilsonjm@gmail.com')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- TRIGGER: impede que o próprio utilizador altere o seu plano ou is_admin
-- Só o Super Admin pode alterar o campo "plano"/"is_admin" de qualquer perfil
-- =====================================================================
create or replace function public.prevent_plan_self_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.plano is distinct from old.plano) or (new.is_admin is distinct from old.is_admin) then
    if not public.is_super_admin(auth.uid()) then
      new.plano := old.plano;
      new.is_admin := old.is_admin;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_prevent_plan_self_change on public.profiles;
create trigger trg_prevent_plan_self_change
  before update on public.profiles
  for each row execute function public.prevent_plan_self_change();

-- =====================================================================
-- TRIGGER: regista no histórico toda vez que o plano de alguém muda
-- (usado no Painel Admin → "Histórico de mudanças de plano")
-- =====================================================================
create or replace function public.log_plan_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.plano is distinct from old.plano then
    insert into public.plan_history (user_id, plano_anterior, plano_novo, alterado_por)
    values (new.id, old.plano, new.plano, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_plan_change on public.profiles;
create trigger trg_log_plan_change
  after update on public.profiles
  for each row execute function public.log_plan_change();

-- =====================================================================
-- TRIGGER: limite de 2 carteiras para plano FREE
-- =====================================================================
create or replace function public.check_wallet_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plano text;
  v_count int;
begin
  select plano into v_plano from public.profiles where id = new.user_id;
  if v_plano = 'FREE' then
    select count(*) into v_count from public.wallets where user_id = new.user_id;
    if v_count >= 2 then
      raise exception 'LIMITE_FREE_CARTEIRAS: Plano FREE permite no máximo 2 carteiras. Torne-se PRO para carteiras ilimitadas.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_wallet_limit on public.wallets;
create trigger trg_check_wallet_limit
  before insert on public.wallets
  for each row execute function public.check_wallet_limit();

-- =====================================================================
-- TRIGGER: limite de 100 transações/mês para plano FREE
-- (não conta transferências entre carteiras próprias no limite)
-- =====================================================================
create or replace function public.check_transaction_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plano text;
  v_count int;
begin
  select plano into v_plano from public.profiles where id = new.user_id;
  if v_plano = 'FREE' then
    select count(*) into v_count
    from public.transactions
    where user_id = new.user_id
      and date_trunc('month', data) = date_trunc('month', new.data);
    if v_count >= 100 then
      raise exception 'LIMITE_FREE_TRANSACOES: Plano FREE permite no máximo 100 transações por mês. Torne-se PRO para transações ilimitadas.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_transaction_limit on public.transactions;
create trigger trg_check_transaction_limit
  before insert on public.transactions
  for each row execute function public.check_transaction_limit();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.wallet_members enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.plan_history enable row level security;
alter table public.push_subscriptions enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_super_admin(auth.uid()));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_super_admin(auth.uid()));

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------- WALLETS (dono OU membro aceite podem ver) ----------
drop policy if exists "wallets_select" on public.wallets;
create policy "wallets_select" on public.wallets
  for select using (auth.uid() = user_id or public.has_wallet_access(id, auth.uid()));

drop policy if exists "wallets_insert" on public.wallets;
create policy "wallets_insert" on public.wallets
  for insert with check (auth.uid() = user_id);

drop policy if exists "wallets_update" on public.wallets;
create policy "wallets_update" on public.wallets
  for update using (auth.uid() = user_id);

drop policy if exists "wallets_delete" on public.wallets;
create policy "wallets_delete" on public.wallets
  for delete using (auth.uid() = user_id);

-- ---------- CATEGORIES ----------
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "categories_insert" on public.categories;
create policy "categories_insert" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_update" on public.categories;
create policy "categories_update" on public.categories
  for update using (auth.uid() = user_id);

drop policy if exists "categories_delete" on public.categories;
create policy "categories_delete" on public.categories
  for delete using (auth.uid() = user_id);

-- ---------- TRANSACTIONS (acesso liberado também a membros da carteira) ----------
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (auth.uid() = user_id or public.has_wallet_access(wallet_id, auth.uid()));

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions
  for insert with check (auth.uid() = user_id and public.can_edit_wallet(wallet_id, auth.uid()));

drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update" on public.transactions
  for update using (public.can_edit_wallet(wallet_id, auth.uid()));

drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_delete" on public.transactions
  for delete using (public.can_edit_wallet(wallet_id, auth.uid()));

-- ---------- GOALS ----------
drop policy if exists "goals_select" on public.goals;
create policy "goals_select" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals_insert" on public.goals;
create policy "goals_insert" on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update" on public.goals;
create policy "goals_update" on public.goals
  for update using (auth.uid() = user_id);

drop policy if exists "goals_delete" on public.goals;
create policy "goals_delete" on public.goals
  for delete using (auth.uid() = user_id);

-- ---------- WALLET_MEMBERS ----------
-- Vê a lista: o dono da carteira, o próprio membro já ligado, ou o
-- convidado (antes mesmo de aceitar) comparando pelo e-mail de login
drop policy if exists "wallet_members_select" on public.wallet_members;
create policy "wallet_members_select" on public.wallet_members
  for select using (
    public.is_wallet_owner(wallet_id, auth.uid())
    or user_id = auth.uid()
    or lower(convidado_email) = lower(auth.email())
  );

drop policy if exists "wallet_members_insert" on public.wallet_members;
create policy "wallet_members_insert" on public.wallet_members
  for insert with check (public.is_wallet_owner(wallet_id, auth.uid()));

drop policy if exists "wallet_members_update" on public.wallet_members;
create policy "wallet_members_update" on public.wallet_members
  for update using (public.is_wallet_owner(wallet_id, auth.uid()));

drop policy if exists "wallet_members_delete" on public.wallet_members;
create policy "wallet_members_delete" on public.wallet_members
  for delete using (public.is_wallet_owner(wallet_id, auth.uid()));

-- ---------- RECURRING_TRANSACTIONS ----------
drop policy if exists "recurring_select" on public.recurring_transactions;
create policy "recurring_select" on public.recurring_transactions
  for select using (public.has_wallet_access(wallet_id, auth.uid()));

drop policy if exists "recurring_insert" on public.recurring_transactions;
create policy "recurring_insert" on public.recurring_transactions
  for insert with check (auth.uid() = user_id and public.can_edit_wallet(wallet_id, auth.uid()));

drop policy if exists "recurring_update" on public.recurring_transactions;
create policy "recurring_update" on public.recurring_transactions
  for update using (public.can_edit_wallet(wallet_id, auth.uid()));

drop policy if exists "recurring_delete" on public.recurring_transactions;
create policy "recurring_delete" on public.recurring_transactions
  for delete using (public.can_edit_wallet(wallet_id, auth.uid()));

-- ---------- PLAN_HISTORY (só leitura: Admin vê tudo, utilizador vê o seu) ----------
drop policy if exists "plan_history_select" on public.plan_history;
create policy "plan_history_select" on public.plan_history
  for select using (public.is_super_admin(auth.uid()) or user_id = auth.uid());

-- ---------- PUSH_SUBSCRIPTIONS ----------
drop policy if exists "push_select" on public.push_subscriptions;
create policy "push_select" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_insert" on public.push_subscriptions;
create policy "push_insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_delete" on public.push_subscriptions;
create policy "push_delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- CATEGORIAS PADRÃO DO SISTEMA (visíveis a todos os utilizadores)
-- =====================================================================
insert into public.categories (user_id, nome, tipo, cor) values
  (null, 'Salário', 'entrada', '#10B981'),
  (null, 'Freelance', 'entrada', '#3B82F6'),
  (null, 'Outras Receitas', 'entrada', '#22C55E'),
  (null, 'Alimentação', 'saida', '#EF4444'),
  (null, 'Transporte', 'saida', '#F59E0B'),
  (null, 'Habitação', 'saida', '#8B5CF6'),
  (null, 'Saúde', 'saida', '#EC4899'),
  (null, 'Educação', 'saida', '#06B6D4'),
  (null, 'Lazer', 'saida', '#F97316'),
  (null, 'Outras Despesas', 'saida', '#6B7280')
on conflict do nothing;

-- =====================================================================
-- NOTA IMPORTANTE SOBRE O SUPER ADMIN
-- =====================================================================
-- O utilizador tonilsonjm@gmail.com deve REGISTAR-SE normalmente pela
-- aplicação (ecrã de Registo). O trigger handle_new_user() vai detectar
-- este e-mail automaticamente e marcar is_admin = true.
--
-- Se o utilizador já existir e quiser promovê-lo manualmente, execute:
--
-- update public.profiles set is_admin = true where email = 'tonilsonjm@gmail.com';
--
-- (rode este UPDATE diretamente no SQL Editor, pois lá corre como
-- superuser e não é bloqueado pelo trigger de proteção)
-- =====================================================================
