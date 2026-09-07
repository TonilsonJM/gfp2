-- =====================================================================
-- Fin JM - Migração v3
-- Execute no SQL Editor se já tinha corrido o schema.sql anteriormente
-- (não apaga nenhum dado existente)
-- =====================================================================

-- ---------- Novas colunas ----------
alter table public.transactions add column if not exists eh_transferencia boolean not null default false;
alter table public.transactions add column if not exists transferencia_grupo_id uuid;

alter table public.goals add column if not exists contribuicao_mensal numeric(14,2);
alter table public.goals add column if not exists ultimo_mes_contribuicao date;

-- ---------- Novas tabelas ----------
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

create table if not exists public.plan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plano_anterior text,
  plano_novo text not null,
  alterado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_members_wallet on public.wallet_members(wallet_id);
create index if not exists idx_wallet_members_email on public.wallet_members(convidado_email);
create index if not exists idx_recurring_wallet on public.recurring_transactions(wallet_id);
create index if not exists idx_plan_history_user on public.plan_history(user_id);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- ---------- Funções auxiliares ----------
create or replace function public.is_wallet_owner(p_wallet_id uuid, p_uid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.wallets w where w.id = p_wallet_id and w.user_id = p_uid);
$$;

create or replace function public.has_wallet_access(p_wallet_id uuid, p_uid uuid)
returns boolean language sql security definer stable as $$
  select public.is_wallet_owner(p_wallet_id, p_uid) or exists (
    select 1 from public.wallet_members m
    where m.wallet_id = p_wallet_id and m.user_id = p_uid and m.status = 'aceite'
  );
$$;

create or replace function public.can_edit_wallet(p_wallet_id uuid, p_uid uuid)
returns boolean language sql security definer stable as $$
  select public.is_wallet_owner(p_wallet_id, p_uid) or exists (
    select 1 from public.wallet_members m
    where m.wallet_id = p_wallet_id and m.user_id = p_uid
      and m.status = 'aceite' and m.papel = 'editor'
  );
$$;

create or replace function public.aceitar_convites_pendentes()
returns void language plpgsql security definer as $$
begin
  update public.wallet_members
  set user_id = auth.uid(), status = 'aceite'
  where lower(convidado_email) = lower(auth.email()) and user_id is null;
end;
$$;

create or replace function public.log_plan_change()
returns trigger language plpgsql security definer as $$
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

-- ---------- RLS das novas tabelas ----------
alter table public.wallet_members enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.plan_history enable row level security;
alter table public.push_subscriptions enable row level security;

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

drop policy if exists "plan_history_select" on public.plan_history;
create policy "plan_history_select" on public.plan_history
  for select using (public.is_super_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists "push_select" on public.push_subscriptions;
create policy "push_select" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_insert" on public.push_subscriptions;
create policy "push_insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_delete" on public.push_subscriptions;
create policy "push_delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ---------- Atualiza policies de wallets/transactions p/ acesso partilhado ----------
drop policy if exists "wallets_select" on public.wallets;
create policy "wallets_select" on public.wallets
  for select using (auth.uid() = user_id or public.has_wallet_access(id, auth.uid()));

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
