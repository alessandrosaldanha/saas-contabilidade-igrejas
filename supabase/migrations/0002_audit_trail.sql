-- Trilha de auditoria real: helpers de IP/device, triggers em transactions
-- (aprovação/estorno) e logging nas RPCs de RBAC e de login já existentes.
-- Rode este arquivo no SQL Editor do projeto Supabase (depois de 0001_init.sql).

-- =========================================================
-- Helpers: extraem IP/user-agent dos headers da requisição
-- (PostgREST expõe isso via a GUC request.headers quando a chamada
-- vem da API REST/RPC; fora desse contexto, caem no fallback '—').
-- =========================================================
create or replace function public.request_ip()
returns text
language plpgsql
stable
as $$
declare
  headers json;
begin
  headers := nullif(current_setting('request.headers', true), '')::json;
  return coalesce(headers ->> 'x-forwarded-for', headers ->> 'x-real-ip', '—');
exception when others then
  return '—';
end;
$$;

create or replace function public.request_device()
returns text
language plpgsql
stable
as $$
declare
  headers json;
begin
  headers := nullif(current_setting('request.headers', true), '')::json;
  return coalesce(headers ->> 'user-agent', '—');
exception when others then
  return '—';
end;
$$;

-- =========================================================
-- Triggers em transactions: toda inserção (Confirmar e Salvar) e
-- toda exclusão (estorno) geram um registro imutável de auditoria.
-- =========================================================
create or replace function public.log_transaction_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (
    auth.uid(),
    coalesce(actor_role, 'Sistema'),
    'aprovacao_caixa',
    'Aprovação de Caixa',
    '—',
    format('%s: R$ %s (%s)', case when new.type = 'entrada' then 'Entrada' else 'Saída' end, new.value, new.category),
    public.request_ip(),
    public.request_device()
  );
  return new;
end;
$$;

drop trigger if exists on_transaction_insert on public.transactions;
create trigger on_transaction_insert
  after insert on public.transactions
  for each row execute function public.log_transaction_insert();

create or replace function public.log_transaction_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (
    auth.uid(),
    coalesce(actor_role, 'Sistema'),
    'estorno',
    'Estorno/Exclusão',
    format('%s: R$ %s (%s)', case when old.type = 'entrada' then 'Entrada' else 'Saída' end, old.value, old.category),
    'Estornado/Excluído',
    public.request_ip(),
    public.request_device()
  );
  return old;
end;
$$;

drop trigger if exists on_transaction_delete on public.transactions;
create trigger on_transaction_delete
  after delete on public.transactions
  for each row execute function public.log_transaction_delete();

-- =========================================================
-- Estorno é uma exclusão feita por Admin (mesma policy de sempre);
-- nada muda em transactions_delete_admin, só reaproveitamos.
-- =========================================================

-- =========================================================
-- Login: touch_last_access() agora também registra o acesso.
-- =========================================================
create or replace function public.touch_last_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  was_pending boolean;
  actor_role text;
begin
  select (status = 'Convite Pendente') into was_pending from public.profiles where id = auth.uid();

  update public.profiles
  set last_access = now(),
      status = case when status = 'Convite Pendente' then 'Ativo' else status end
  where id = auth.uid();

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (
    auth.uid(),
    coalesce(actor_role, '—'),
    'acesso',
    'Acesso/Login',
    '—',
    case when was_pending then 'Primeiro login (conta ativada)' else 'Login realizado' end,
    public.request_ip(),
    public.request_device()
  );
end;
$$;

-- =========================================================
-- Troca de role/status: agora registram before/after na auditoria.
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
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar perfis de acesso';
  end if;
  if new_role not in ('Admin', 'Tesoureiro', 'Auditor', 'Conselho Fiscal') then
    raise exception 'Role inválida: %', new_role;
  end if;

  select role into old_role from public.profiles where id = target_id;
  update public.profiles set role = new_role where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_role, new_role, public.request_ip(), public.request_device());
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
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o status de acesso';
  end if;
  if new_status not in ('Ativo', 'Inativo', 'Convite Pendente') then
    raise exception 'Status inválido: %', new_status;
  end if;

  select status into old_status from public.profiles where id = target_id;
  update public.profiles set status = new_status where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_status, new_status, public.request_ip(), public.request_device());
end;
$$;
