-- Corrige o dead-end crítico do autocadastro (o projeto exige confirmação de
-- e-mail: signUp() não retorna sessão, então a antiga complete_self_signup()
-- nunca rodava e o usuário ficava com profile órfão — church_id nulo pra
-- sempre, bloqueado pela própria RLS até no login) e adiciona a governança de
-- hierarquia de igrejas (igrejas filhas/subcongregações) para o Admin de uma
-- igreja própria, não só o master.

-- =========================================================
-- 1) complete_pending_church_signup(): substitui complete_self_signup(text).
-- Sem parâmetro — lê o nome da igreja do próprio user_metadata (gravado no
-- signUp()), então pode ser chamada de forma idempotente e sem argumento a
-- cada login (AuthContext.signIn), não só imediatamente após o cadastro.
-- No-op para qualquer usuário que já tenha igreja (inclusive master).
-- =========================================================
drop function if exists public.complete_self_signup(text);

create or replace function public.complete_pending_church_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_church uuid;
  v_church_name text;
  v_church_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  select church_id into v_current_church from public.profiles where id = auth.uid();
  if v_current_church is not null then
    return;
  end if;

  select raw_user_meta_data ->> 'church_name' into v_church_name from auth.users where id = auth.uid();
  if v_church_name is null or trim(v_church_name) = '' then
    return;
  end if;

  insert into public.churches (name, plan_id, subscription_status, cep, street, number, neighborhood, city, uf)
  values (trim(v_church_name), public.default_free_plan_id(), 'active', '', '', '', '', '', '')
  returning id into v_church_id;

  update public.profiles set church_id = v_church_id where id = auth.uid();
end;
$$;

grant execute on function public.complete_pending_church_signup() to authenticated;

-- =========================================================
-- 2) churches.responsible_name — coletado no cadastro rápido de igreja filha
-- (a subcongregação normalmente ainda não tem nenhum membro/login próprio).
-- =========================================================
alter table public.churches add column responsible_name text;

-- =========================================================
-- 3) create_child_church(): Admin cria uma igreja filha da PRÓPRIA igreja
-- (não uma neta — hierarquia de 2 níveis, só organizacional). Herda plano e
-- status de assinatura da igreja mãe (fazem parte da mesma assinatura) e
-- reforça o limite max_churches do plano no servidor (master não tem limite).
-- =========================================================
create or replace function public.create_child_church(
  p_parent_church_id uuid,
  p_name text,
  p_responsible_name text,
  p_email text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_subscription_status text;
  v_max_churches integer;
  v_children_count integer;
  v_child_id uuid;
begin
  if not (public.is_master() or (public.has_role(array['Admin']) and p_parent_church_id = public.current_church_id())) then
    raise exception 'Sem permissão para adicionar igreja filha a esta igreja';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Informe o nome da igreja filha';
  end if;

  select plan_id, subscription_status into v_plan_id, v_subscription_status
  from public.churches where id = p_parent_church_id;
  if v_plan_id is null then
    raise exception 'Igreja mãe não encontrada';
  end if;

  if not public.is_master() then
    select max_churches into v_max_churches from public.plans where id = v_plan_id;
    select count(*) into v_children_count from public.churches where parent_church_id = p_parent_church_id;
    if v_children_count + 1 >= v_max_churches then
      raise exception 'Limite de igrejas do plano atual atingido';
    end if;
  end if;

  insert into public.churches (
    name, responsible_name, email, phone, parent_church_id, plan_id, subscription_status,
    cep, street, number, neighborhood, city, uf
  )
  values (
    trim(p_name), nullif(trim(coalesce(p_responsible_name, '')), ''), nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''), p_parent_church_id, v_plan_id, v_subscription_status,
    '', '', '', '', '', ''
  )
  returning id into v_child_id;

  return v_child_id;
end;
$$;

grant execute on function public.create_child_church(uuid, text, text, text, text) to authenticated;

-- =========================================================
-- 4) update_church_profile(): única forma do Admin (própria igreja ou filha
-- direta) editar dados cadastrais de uma igreja — só os campos "seguros"
-- (nunca plan_id/subscription_status/is_active/parent_church_id, que
-- continuam exclusivos do master via churches_update_master). Master também
-- passa a usar esta RPC na página de Detalhes da Igreja (endpoint único).
-- =========================================================
create or replace function public.update_church_profile(
  p_church_id uuid,
  p_name text,
  p_email text,
  p_cnpj text,
  p_phone text,
  p_cep text,
  p_street text,
  p_number text,
  p_neighborhood text,
  p_city text,
  p_uf text,
  p_responsible_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_master()
    or (
      public.has_role(array['Admin'])
      and (
        p_church_id = public.current_church_id()
        or exists (select 1 from public.churches where id = p_church_id and parent_church_id = public.current_church_id())
      )
    )
  ) then
    raise exception 'Sem permissão para editar esta igreja';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Informe o nome da igreja';
  end if;

  update public.churches set
    name = trim(p_name),
    email = nullif(trim(coalesce(p_email, '')), ''),
    cnpj = nullif(trim(coalesce(p_cnpj, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    cep = coalesce(trim(p_cep), ''),
    street = coalesce(trim(p_street), ''),
    number = coalesce(trim(p_number), ''),
    neighborhood = coalesce(trim(p_neighborhood), ''),
    city = coalesce(trim(p_city), ''),
    uf = coalesce(trim(p_uf), ''),
    responsible_name = nullif(trim(coalesce(p_responsible_name, '')), '')
  where id = p_church_id;
end;
$$;

grant execute on function public.update_church_profile(uuid, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

-- =========================================================
-- 5) profiles/admin_update_user_role/admin_set_user_status: Admin de uma
-- igreja mãe passa a também enxergar e gerenciar (role/status) os membros de
-- uma igreja FILHA direta — sem isso a seção "Membros" da página de Detalhes
-- de uma subcongregação ficaria sempre vazia/travada para quem não é master.
-- =========================================================
drop policy if exists "profiles_select_active" on public.profiles;
create policy "profiles_select_active" on public.profiles
  for select using (
    public.is_master()
    or (public.is_active() and church_id = public.current_church_id())
    or (
      public.is_active()
      and public.has_role(array['Admin'])
      and exists (select 1 from public.churches c where c.id = profiles.church_id and c.parent_church_id = public.current_church_id())
    )
  );

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
  select church_id into target_church from public.profiles where id = target_id;

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

  select status into old_status from public.profiles where id = target_id;
  update public.profiles set status = new_status where id = target_id;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (auth.uid(), coalesce(actor_role, 'Admin'), 'edicao_manual', 'Edição Manual', old_status, new_status, public.request_ip(), public.request_device(), target_church);
end;
$$;
