-- Fundação de dados: perfis (RBAC), lançamentos, auditoria e histórico de importação.
-- Rode este arquivo no SQL Editor do seu projeto Supabase (ou via `supabase db push`).

create extension if not exists pgcrypto;

-- =========================================================
-- profiles (estende auth.users com role/status do RBAC)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'Tesoureiro' check (role in ('Admin', 'Tesoureiro', 'Auditor', 'Conselho Fiscal')),
  status text not null default 'Convite Pendente' check (status in ('Ativo', 'Inativo', 'Convite Pendente')),
  last_access timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- =========================================================
-- transactions (Livro Caixa)
-- =========================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  description text not null,
  value numeric(14, 2) not null,
  type text not null check (type in ('entrada', 'saida')),
  category text not null,
  confidence text not null default 'media' check (confidence in ('alta', 'media', 'baixa')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- =========================================================
-- audit_logs (trilha de auditoria, somente inserção)
-- =========================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references public.profiles (id),
  role text not null,
  action_key text not null check (action_key in ('categorizacao_ia', 'edicao_manual', 'aprovacao_caixa', 'estorno', 'acesso')),
  action_label text not null,
  before text,
  after text,
  ip text,
  device text
);

alter table public.audit_logs enable row level security;

-- =========================================================
-- import_history (histórico de importações de extrato)
-- =========================================================
create table public.import_history (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  month_label text not null,
  count int not null default 0,
  imported_by uuid references public.profiles (id),
  imported_at timestamptz not null default now()
);

alter table public.import_history enable row level security;

-- =========================================================
-- Funções auxiliares de RBAC (SECURITY DEFINER: leem/gravam
-- em profiles ignorando a própria RLS da tabela)
-- =========================================================
create or replace function public.has_role(roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = any(roles)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_role(array['Admin']);
$$;

-- Cria o profile automaticamente quando um usuário é criado no Supabase Auth
-- (login normal ou convite via Edge Function invite-user).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'Tesoureiro'),
    'Convite Pendente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza o último acesso e ativa o usuário no primeiro login pós-convite.
create or replace function public.touch_last_access()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_access = now(),
      status = case when status = 'Convite Pendente' then 'Ativo' else status end
  where id = auth.uid();
$$;

-- Alteração de role/status só pode ser feita por Admin (chamado via RPC, nunca
-- por update direto na tabela a partir do frontend).
create or replace function public.admin_update_user_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar perfis de acesso';
  end if;
  if new_role not in ('Admin', 'Tesoureiro', 'Auditor', 'Conselho Fiscal') then
    raise exception 'Role inválida: %', new_role;
  end if;
  update public.profiles set role = new_role where id = target_id;
end;
$$;

create or replace function public.admin_set_user_status(target_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o status de acesso';
  end if;
  if new_status not in ('Ativo', 'Inativo', 'Convite Pendente') then
    raise exception 'Status inválido: %', new_status;
  end if;
  update public.profiles set status = new_status where id = target_id;
end;
$$;

grant execute on function public.touch_last_access() to authenticated;
grant execute on function public.admin_update_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_user_status(uuid, text) to authenticated;

-- =========================================================
-- Políticas RLS
-- =========================================================

-- profiles: qualquer usuário autenticado pode ver o diretório da equipe;
-- alteração de role/status só via RPC acima (sem policy de UPDATE direta).
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

-- transactions: leitura para todos os papéis (auditabilidade total);
-- escrita restrita a quem lança/aprova o caixa.
create policy "transactions_select_authenticated" on public.transactions
  for select using (auth.role() = 'authenticated');

create policy "transactions_insert_treasury" on public.transactions
  for insert with check (public.has_role(array['Admin', 'Tesoureiro']));

create policy "transactions_update_treasury" on public.transactions
  for update using (public.has_role(array['Admin', 'Tesoureiro']))
  with check (public.has_role(array['Admin', 'Tesoureiro']));

create policy "transactions_delete_admin" on public.transactions
  for delete using (public.is_admin());

-- audit_logs: log é append-only — sem policy de update/delete (nega por padrão).
create policy "audit_logs_select_authenticated" on public.audit_logs
  for select using (auth.role() = 'authenticated');

create policy "audit_logs_insert_authenticated" on public.audit_logs
  for insert with check (auth.role() = 'authenticated');

-- import_history
create policy "import_history_select_authenticated" on public.import_history
  for select using (auth.role() = 'authenticated');

create policy "import_history_insert_treasury" on public.import_history
  for insert with check (public.has_role(array['Admin', 'Tesoureiro']));
