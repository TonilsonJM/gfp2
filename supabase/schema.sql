-- =====================================================================
-- GFP - Gestão Financeira Pessoal
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
  plano text not null default 'FREE' check (plano in ('FREE', 'PRO')),
  is_admin boolean not null default false,
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
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 5. TABELA: goals (metas)
-- =====================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  nome text not null,
  valor_alvo numeric(14,2) not null check (valor_alvo > 0),
  valor_atual numeric(14,2) not null default 0,
  data_limite date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists idx_wallets_user on public.wallets(user_id);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_wallet on public.transactions(wallet_id);
create index if not exists idx_transactions_data on public.transactions(data);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_categories_user on public.categories(user_id);

-- =====================================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER evita recursão nas policies)
-- =====================================================================

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
begin
  insert into public.profiles (id, nome, email, plano, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
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

-- ---------- WALLETS ----------
drop policy if exists "wallets_select" on public.wallets;
create policy "wallets_select" on public.wallets
  for select using (auth.uid() = user_id);

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

-- ---------- TRANSACTIONS ----------
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update" on public.transactions
  for update using (auth.uid() = user_id);

drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_delete" on public.transactions
  for delete using (auth.uid() = user_id);

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
