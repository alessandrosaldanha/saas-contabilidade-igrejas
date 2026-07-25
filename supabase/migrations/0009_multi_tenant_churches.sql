-- Multi-tenant: introduz a tabela `churches` (igrejas) e passa a isolar por
-- church_id todo o schema hoje single-tenant (profiles/transactions/
-- import_history/audit_logs), além do papel `master` (Admin Master da SaaS,
-- acesso irrestrito a todas as igrejas). Rode/aplique depois de 0008.

-- =========================================================
-- 1) Tabela churches
-- =========================================================
create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  cnpj text,
  phone text,
  cep text not null,
  street text not null,
  number text not null,
  neighborhood text not null,
  city text not null,
  uf text not null,
  parent_church_id uuid references public.churches (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.churches enable row level security;

-- =========================================================
-- 2) profiles: church_id + cpf
-- =========================================================
alter table public.profiles
  add column church_id uuid references public.churches (id),
  add column cpf text;

-- =========================================================
-- 3) transactions / import_history / audit_logs: church_id
-- (nullable por enquanto — backfill vem no passo 5, NOT NULL/DEFAULT no passo 6)
-- =========================================================
alter table public.transactions add column church_id uuid references public.churches (id);
alter table public.import_history add column church_id uuid references public.churches (id);
alter table public.audit_logs add column church_id uuid references public.churches (id);

-- =========================================================
-- 4) Funções de tenant: is_master() / current_church_id()
-- =========================================================
create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'master'
  );
$$;

create or replace function public.current_church_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select church_id from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- 4.1) role check precisa aceitar 'master' ANTES do backfill abaixo (a
-- constraint de consistência church_id<->master só entra depois, no passo 6,
-- quando os dados já estiverem coerentes).
-- =========================================================
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['master', 'Admin', 'Tesoureiro', 'Auditor', 'Conselho Fiscal']));

-- =========================================================
-- 5) Seed da igreja atual + backfill dos dados existentes
-- (3 profiles, 613 audit_logs, 0 transactions/import_history hoje)
-- =========================================================
do $$
declare
  v_church_id uuid;
begin
  insert into public.churches (name, cep, street, number, neighborhood, city, uf)
  values (
    'Igreja Batista Reformada',
    '57075-440',
    'Av. Eng. Corintho Campelo da Paz',
    '80',
    'Santos Dumont',
    'Maceió',
    'AL'
  )
  returning id into v_church_id;

  update public.profiles
  set role = 'master', church_id = null
  where email = 'alessandrosaldanha.as@gmail.com';

  update public.profiles
  set church_id = v_church_id
  where email <> 'alessandrosaldanha.as@gmail.com';

  update public.audit_logs set church_id = v_church_id where church_id is null;
  update public.transactions set church_id = v_church_id where church_id is null;
  update public.import_history set church_id = v_church_id where church_id is null;
end $$;

-- =========================================================
-- 6) Defaults/constraints agora que os dados existentes já têm church_id
-- =========================================================
alter table public.transactions alter column church_id set default public.current_church_id();
alter table public.transactions alter column church_id set not null;

alter table public.import_history alter column church_id set default public.current_church_id();
alter table public.import_history alter column church_id set not null;

-- audit_logs fica NULLABLE de propósito: ações globais do Master (ex.: criar
-- uma igreja nova) não pertencem a nenhum tenant específico.
alter table public.audit_logs alter column church_id set default public.current_church_id();

alter table public.profiles add constraint profiles_church_id_master_check
  check ((role = 'master' and church_id is null) or (role <> 'master' and church_id is not null));

-- =========================================================
-- 7) has_role()/is_active(): bypass total para master + igreja precisa estar
-- ativa (além do status do usuário) — is_admin() já delega para has_role(),
-- então não precisa ser redefinida.
-- =========================================================
create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master() or exists (
    select 1
    from public.profiles p
    join public.churches c on c.id = p.church_id
    where p.id = auth.uid()
      and p.role = any(roles)
      and p.status <> 'Inativo'
      and c.is_active
  );
$$;

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master() or coalesce(
    (
      select p.status <> 'Inativo' and c.is_active
      from public.profiles p
      join public.churches c on c.id = p.church_id
      where p.id = auth.uid()
    ),
    false
  );
$$;

-- =========================================================
-- 8) RPCs de RBAC: agora exigem mesma igreja do alvo (a menos que seja master)
-- =========================================================
create or replace function public.admin_update_user_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role text;
  actor_role text;
  target_church uuid;
begin
  select church_id into target_church from public.profiles where id = target_id;

  if not (public.is_master() or (public.is_admin() and target_church = public.current_church_id())) then
    raise exception 'Apenas administradores podem alterar perfis de acesso desta igreja';
  end if;
  if new_role not in ('Admin', 'Tesoureiro', 'Auditor', 'Conselho Fiscal') then
    raise exception 'Role inválida: %', new_role;
  end if;

  select role into old_role from public.profiles where id = target_id;
  update public.profiles set role = new_role where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_role, new_role, public.request_ip(), public.request_device(), target_church);
end;
$$;

create or replace function public.admin_set_user_status(target_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status text;
  actor_role text;
  target_church uuid;
begin
  select church_id into target_church from public.profiles where id = target_id;

  if not (public.is_master() or (public.is_admin() and target_church = public.current_church_id())) then
    raise exception 'Apenas administradores podem alterar o status de acesso desta igreja';
  end if;
  if new_status not in ('Ativo', 'Inativo', 'Convite Pendente') then
    raise exception 'Status inválido: %', new_status;
  end if;

  select status into old_status from public.profiles where id = target_id;
  update public.profiles set status = new_status where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_status, new_status, public.request_ip(), public.request_device(), target_church);
end;
$$;

-- Novo: só o Master edita nome/e-mail/CPF de um perfil que não é o seu (o
-- update_own_profile existente continua servindo para autoedição de qualquer role).
create or replace function public.master_update_profile(target_id uuid, new_name text, new_email text, new_cpf text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_name text;
  old_email text;
  old_cpf text;
  target_church uuid;
begin
  if not public.is_master() then
    raise exception 'Apenas o Admin Master pode editar outros perfis diretamente';
  end if;

  select name, email, cpf, church_id into old_name, old_email, old_cpf, target_church
  from public.profiles where id = target_id;

  if old_name is null then
    raise exception 'Perfil não encontrado';
  end if;
  if new_name is null or trim(new_name) = '' then
    raise exception 'Nome não pode ficar em branco';
  end if;
  if new_email is null or trim(new_email) = '' then
    raise exception 'E-mail não pode ficar em branco';
  end if;

  update public.profiles
  set name = trim(new_name),
      email = trim(new_email),
      cpf = nullif(trim(coalesce(new_cpf, '')), '')
  where id = target_id;

  if old_name is distinct from trim(new_name)
     or old_email is distinct from trim(new_email)
     or old_cpf is distinct from nullif(trim(coalesce(new_cpf, '')), '') then
    insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
    values (
      auth.uid(),
      'master',
      'edicao_manual',
      'Edição Manual (Admin Master)',
      'Nome: ' || old_name || ' · E-mail: ' || old_email || ' · CPF: ' || coalesce(old_cpf, '—'),
      'Nome: ' || trim(new_name) || ' · E-mail: ' || trim(new_email) || ' · CPF: ' || coalesce(nullif(trim(coalesce(new_cpf, '')), ''), '—'),
      public.request_ip(),
      public.request_device(),
      target_church
    );
  end if;
end;
$$;

grant execute on function public.master_update_profile(uuid, text, text, text) to authenticated;

-- handle_new_user(): agora também aceita church_id/cpf vindos do
-- user_metadata (a Edge Function invite-user passa isso ao criar o usuário).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, status, church_id, cpf)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'Tesoureiro'),
    'Convite Pendente',
    nullif(new.raw_user_meta_data ->> 'church_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'cpf', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =========================================================
-- 9) Triggers de auditoria em churches (criação/edição, inclusive
-- ativar/desativar) — mesmo padrão já usado em transactions/import_history.
-- =========================================================
create or replace function public.log_church_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (
    auth.uid(),
    coalesce(actor_role, 'master'),
    'edicao_manual',
    'Igreja Cadastrada',
    '—',
    format('%s (%s/%s)', new.name, new.city, new.uf),
    public.request_ip(),
    public.request_device(),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_church_insert on public.churches;
create trigger on_church_insert
  after insert on public.churches
  for each row execute function public.log_church_insert();

create or replace function public.log_church_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if new.* is not distinct from old.* then
    return new;
  end if;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (
    auth.uid(),
    coalesce(actor_role, 'master'),
    'edicao_manual',
    case when old.is_active <> new.is_active then 'Status da Igreja Alterado' else 'Edição Manual (Admin Master)' end,
    format('%s — %s', old.name, case when old.is_active then 'Ativa' else 'Inativa' end),
    format('%s — %s', new.name, case when new.is_active then 'Ativa' else 'Inativa' end),
    public.request_ip(),
    public.request_device(),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_church_update on public.churches;
create trigger on_church_update
  after update on public.churches
  for each row execute function public.log_church_update();

-- =========================================================
-- 10) RLS: reescreve profiles/transactions/import_history/audit_logs com
-- isolamento por church_id (+ bypass total para master) e adiciona as
-- policies de churches (só o master lê/cria/edita; sem policy de delete —
-- igreja só é ativada/desativada, nunca excluída).
-- =========================================================
drop policy if exists "profiles_select_active" on public.profiles;
create policy "profiles_select_active" on public.profiles
  for select using (
    public.is_master() or (public.is_active() and church_id = public.current_church_id())
  );

drop policy if exists "transactions_select_active" on public.transactions;
create policy "transactions_select_active" on public.transactions
  for select using (
    public.is_master() or (public.is_active() and church_id = public.current_church_id())
  );

drop policy if exists "transactions_insert_treasury" on public.transactions;
create policy "transactions_insert_treasury" on public.transactions
  for insert with check (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

drop policy if exists "transactions_update_treasury" on public.transactions;
create policy "transactions_update_treasury" on public.transactions
  for update using (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  )
  with check (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

drop policy if exists "transactions_delete_admin" on public.transactions;
create policy "transactions_delete_admin" on public.transactions
  for delete using (
    public.is_master() or (public.is_admin() and church_id = public.current_church_id())
  );

drop policy if exists "import_history_select_active" on public.import_history;
create policy "import_history_select_active" on public.import_history
  for select using (
    public.is_master() or (public.is_active() and church_id = public.current_church_id())
  );

drop policy if exists "import_history_insert_treasury" on public.import_history;
create policy "import_history_insert_treasury" on public.import_history
  for insert with check (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

drop policy if exists "import_history_update_treasury" on public.import_history;
create policy "import_history_update_treasury" on public.import_history
  for update using (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

drop policy if exists "import_history_delete_admin" on public.import_history;
create policy "import_history_delete_admin" on public.import_history
  for delete using (
    public.is_master() or (public.is_admin() and church_id = public.current_church_id())
  );

drop policy if exists "audit_logs_select_admin_auditor_conselho" on public.audit_logs;
create policy "audit_logs_select_admin_auditor_conselho" on public.audit_logs
  for select using (
    public.is_master() or (public.has_role(array['Admin', 'Auditor', 'Conselho Fiscal']) and church_id = public.current_church_id())
  );

drop policy if exists "audit_logs_insert_active" on public.audit_logs;
create policy "audit_logs_insert_active" on public.audit_logs
  for insert with check (
    public.is_active() and (public.is_master() or church_id is null or church_id = public.current_church_id())
  );

create policy "churches_select_master" on public.churches
  for select using (public.is_master());

create policy "churches_insert_master" on public.churches
  for insert with check (public.is_master());

create policy "churches_update_master" on public.churches
  for update using (public.is_master())
  with check (public.is_master());

-- =========================================================
-- 11) Realtime em churches: o AuthContext escuta a própria igreja e força
-- logout se ela for desativada em outra sessão (mesmo padrão já usado em
-- profiles para status = 'Inativo').
-- =========================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'churches'
  ) then
    alter publication supabase_realtime add table public.churches;
  end if;
end $$;
