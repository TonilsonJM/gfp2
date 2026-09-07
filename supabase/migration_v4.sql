-- =====================================================================
-- Fin JM - Migração v4
-- Adiciona nome de utilizador único (minúsculas), usado para login e
-- para convidar membros de carteira, além do e-mail.
-- Execute no SQL Editor. Não apaga nenhum dado existente.
-- =====================================================================

-- 1) Coluna nova (ainda sem restrição, para poder preencher o que já existe)
alter table public.profiles add column if not exists username text;

-- 2) Função que gera um username válido e único a partir do e-mail
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

-- 3) Preenche o username de quem já tinha conta (um a um, para garantir
-- que a verificação de duplicados enxerga os que acabaram de ser gerados)
do $$
declare
  r record;
  v_username text;
begin
  for r in select id, email from public.profiles where username is null loop
    v_username := public.gerar_username_a_partir_do_email(r.email);
    update public.profiles set username = v_username where id = r.id;
  end loop;
end $$;

-- 4) Agora sim, aplica as restrições (minúsculas, 3-20 caracteres, único)
alter table public.profiles alter column username set not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,20}$');

alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add constraint profiles_username_key unique (username);

-- 5) Liga o username ao registo de novas contas (a partir de agora)
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

-- 6) Função pública (sem expor mais nada do perfil) que traduz um
-- username para o e-mail correspondente — usada no login e no convite
-- de membros de carteira por username
create or replace function public.obter_email_por_username(p_username text)
returns text
language sql
security definer
stable
as $$
  select email from public.profiles where username = lower(p_username);
$$;

grant execute on function public.obter_email_por_username(text) to anon, authenticated;
