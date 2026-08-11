-- Exclusão de usuário (Governança e Usuários). "Convite Pendente" nunca gerou
-- histórico (nenhuma linha em audit_logs/transactions/import_history aponta pro
-- seu id) — esse caso usa hard delete real, na Edge Function cancel-invite
-- (service-role), fora desta migration. Ativo/Inativo já têm histórico e essas
-- tabelas referenciam profiles(id) sem ON DELETE CASCADE — um hard delete
-- quebraria a trilha de auditoria (e falharia por violação de FK na prática).
-- Por isso, para esses dois, a exclusão é um soft-delete: novo status terminal
-- 'Excluído', sem período de graça, sem caminho de volta.

-- =========================================================
-- 1) profiles.status ganha o estado terminal 'Excluído'
-- =========================================================
alter table public.profiles drop constraint profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('Ativo', 'Inativo', 'Convite Pendente', 'Excluído'));

-- =========================================================
-- 2) has_role()/is_active(): 'Excluído' bloqueia login/RLS exatamente como
-- 'Inativo' já bloqueia. Sem isso, is_active() continuaria true (só checava
-- `status <> 'Inativo'`) e um usuário excluído continuaria conseguindo logar.
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
      and p.status not in ('Inativo', 'Excluído')
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
      select p.status not in ('Inativo', 'Excluído') and c.is_active
      from public.profiles p
      join public.churches c on c.id = p.church_id
      where p.id = auth.uid()
    ),
    false
  );
$$;

-- =========================================================
-- 3) admin_update_user_role/admin_set_user_status: 'Excluído' é terminal —
-- nenhuma das duas pode tirar um perfil desse estado (só existe o caminho de
-- exclusão via admin_delete_user, nunca o inverso).
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
  select church_id, status into target_church, target_status from public.profiles where id = target_id;

  if target_status = 'Excluído' then
    raise exception 'Usuário excluído não pode mais ser alterado';
  end if;

  if not (
    public.is_master()
    or (
      public.is_admin()
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
  select church_id, status into target_church, old_status from public.profiles where id = target_id;

  if old_status = 'Excluído' then
    raise exception 'Usuário excluído não pode mais ser alterado';
  end if;

  if not (
    public.is_master()
    or (
      public.is_admin()
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
-- 4) admin_delete_user: soft-delete terminal (Ativo/Inativo → Excluído).
-- Master exclui qualquer perfil (exceto o próprio); Admin só membros da
-- própria igreja ou de uma filha direta, nunca outro Admin ou o master.
-- 'Convite Pendente' é rejeitado de propósito — usa a Edge Function
-- cancel-invite (hard delete real, via service-role).
-- =========================================================
create or replace function public.admin_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status text;
  target_role text;
  target_church uuid;
  target_name text;
  target_email text;
  actor_role text;
begin
  if target_id = auth.uid() then
    raise exception 'Você não pode excluir a própria conta';
  end if;

  select church_id, status, role, name, email
    into target_church, old_status, target_role, target_name, target_email
    from public.profiles where id = target_id;

  if target_role is null then
    raise exception 'Usuário não encontrado';
  end if;
  if old_status = 'Excluído' then
    raise exception 'Usuário já foi excluído';
  end if;
  if old_status = 'Convite Pendente' then
    raise exception 'Convite pendente deve ser cancelado, não excluído';
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
    raise exception 'Você não tem permissão para excluir este usuário';
  end if;

  update public.profiles set status = 'Excluído' where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (
    auth.uid(),
    coalesce(actor_role, 'Admin'),
    'estorno',
    'Estorno/Exclusão',
    old_status,
    'Excluído: ' || target_name || ' (' || target_email || ')',
    public.request_ip(),
    public.request_device(),
    target_church
  );
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
