-- Reforça no servidor a hierarquia de só 2 níveis (igreja matriz → filhas):
-- create_child_church() já restringia quem PODE chamar (Admin só na própria
-- igreja), mas não impedia o próprio alvo (p_parent_church_id) de já ser uma
-- igreja filha — o que criaria uma "neta". Vale também para o master, que não
-- tinha nenhuma restrição de hierarquia nesta RPC.
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
  v_parent_of_parent uuid;
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

  select plan_id, subscription_status, parent_church_id into v_plan_id, v_subscription_status, v_parent_of_parent
  from public.churches where id = p_parent_church_id;
  if v_plan_id is null then
    raise exception 'Igreja mãe não encontrada';
  end if;
  if v_parent_of_parent is not null then
    raise exception 'Não é possível cadastrar uma igreja filha dentro de outra igreja filha';
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
