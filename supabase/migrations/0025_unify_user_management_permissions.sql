-- Fecha um buraco pré-existente: admin_update_user_role e admin_set_user_status
-- nunca checaram o role do ALVO — desde a migration 0009 (checagem de igreja) e
-- 0018 (extensão pra filha direta), um Admin já conseguia rebaixar/bloquear
-- outro Admin da própria igreja, sem barreira nenhuma. Adiciona a mesma regra
-- unificada nas duas, e cria admin_update_user_profile (edição de nome/e-mail
-- para Admin, mesmo alcance) já nascendo com a checagem correta.
--
-- Regra final, idêntica nas três (e já replicada em admin_delete_user/
-- cancel-invite na sessão anterior): is_master() OR (is_admin() AND (mesma
-- igreja OU filha direta) AND target.role NOT IN ('Admin', 'master')).

-- =========================================================
-- 1) admin_update_user_role: Admin nunca altera outro Admin (nem o master)
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
  target_status text;
begin
  select church_id, status, role into target_church, target_status, old_role from public.profiles where id = target_id;

  if target_status = 'Excluído' then
    raise exception 'Usuário excluído não pode mais ser alterado';
  end if;

  if not (
    public.is_master()
    or (
      public.is_admin()
      and old_role not in ('Admin', 'master')
      and (
        target_church = public.current_church_id()
        or exists (select 1 from public.churches where id = target_church and parent_church_id = public.current_church_id())
      )
    )
  ) then
    raise exception 'Apenas administradores podem alterar perfis de acesso desta igreja';
  end if;
  if new_role not in ('Admin', 'Tesoureiro', 'Auditor', 'Conselho Fiscal') then
    raise exception 'Role inválida: %', new_role;
  end if;

  update public.profiles set role = new_role where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_role, new_role, public.request_ip(), public.request_device(), target_church);
end;
$$;

-- =========================================================
-- 2) admin_set_user_status: mesma correção
-- =========================================================
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
  target_role text;
begin
  select church_id, status, role into target_church, old_status, target_role from public.profiles where id = target_id;

  if old_status = 'Excluído' then
    raise exception 'Usuário excluído não pode mais ser alterado';
  end if;

  if not (
    public.is_master()
    or (
      public.is_admin()
      and target_role not in ('Admin', 'master')
      and (
        target_church = public.current_church_id()
        or exists (select 1 from public.churches where id = target_church and parent_church_id = public.current_church_id())
      )
    )
  ) then
    raise exception 'Apenas administradores podem alterar o status de acesso desta igreja';
  end if;
  if new_status not in ('Ativo', 'Inativo', 'Convite Pendente') then
    raise exception 'Status inválido: %', new_status;
  end if;

  update public.profiles set status = new_status where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_status, new_status, public.request_ip(), public.request_device(), target_church);
end;
$$;

-- =========================================================
-- 3) admin_update_user_profile: edição de nome/e-mail para Admin (mesmo
-- alcance/checagem das duas acima) — master continua usando
-- master_update_profile, que já existia e não muda aqui.
-- =========================================================
create or replace function public.admin_update_user_profile(target_id uuid, new_name text, new_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_name text;
  old_email text;
  target_church uuid;
  target_status text;
  target_role text;
  actor_role text;
begin
  select name, email, church_id, status, role
    into old_name, old_email, target_church, target_status, target_role
    from public.profiles where id = target_id;

  if old_name is null then
    raise exception 'Perfil não encontrado';
  end if;
  if target_status = 'Excluído' then
    raise exception 'Usuário excluído não pode mais ser alterado';
  end if;
  if new_name is null or trim(new_name) = '' then
    raise exception 'Nome não pode ficar em branco';
  end if;
  if new_email is null or trim(new_email) = '' then
    raise exception 'E-mail não pode ficar em branco';
  end if;

  if not (
    public.is_master()
    or (
      public.is_admin()
      and target_role not in ('Admin', 'master')
      and (
        target_church = public.current_church_id()
        or exists (select 1 from public.churches where id = target_church and parent_church_id = public.current_church_id())
      )
    )
  ) then
    raise exception 'Você não tem permissão para editar este usuário';
  end if;

  update public.profiles
  set name = trim(new_name),
      email = trim(new_email)
  where id = target_id;

  if old_name is distinct from trim(new_name) or old_email is distinct from trim(new_email) then
    select role into actor_role from public.profiles where id = auth.uid();
    insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
    values (
      auth.uid(),
      coalesce(actor_role, 'Admin'),
      'edicao_manual',
      'Edição Manual',
      'Nome: ' || old_name || ' · E-mail: ' || old_email,
      'Nome: ' || trim(new_name) || ' · E-mail: ' || trim(new_email),
      public.request_ip(),
      public.request_device(),
      target_church
    );
  end if;
end;
$$;

grant execute on function public.admin_update_user_profile(uuid, text, text) to authenticated;
