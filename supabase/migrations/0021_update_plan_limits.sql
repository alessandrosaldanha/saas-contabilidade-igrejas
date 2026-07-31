-- Atualiza regras/limites dos 3 planos de assinatura (Free/Igreja Local/
-- Presbitério): novos limites de leitura de IA e PDFs, formatos de
-- importação permitidos e liberação do Modo Estrito por plano — hoje nenhum
-- dos dois últimos era controlado por plano. Também corrige um bug de
-- off-by-one em `max_churches` (o Free, com o valor seed `1`, bloqueava a
-- criação da 1ª igreja filha, quando deveria permitir exatamente 1).
--
-- Padroniza o sentinela de "ilimitado" como `-1` (substituindo o `999999`
-- usado até aqui) nos 3 limites numéricos do plano, para não haver mais
-- mágica de "número grande o bastante" nem no banco nem no front.

-- =========================================================
-- 1) Novas colunas: formatos de importação e Modo Estrito por plano.
-- =========================================================
alter table public.plans
  add column allowed_import_formats text[] not null default '{csv}',
  add column allow_strict_mode boolean not null default false;

-- =========================================================
-- 2) Renomeia max_churches -> max_child_churches (o nome antigo era
-- ambíguo: já foi tratado como "total de igrejas" por create_child_church,
-- o que gerava o off-by-one acima; o nome novo deixa explícito que é o
-- número de igrejas FILHAS permitidas por igreja matriz).
-- =========================================================
alter table public.plans rename column max_churches to max_child_churches;

-- =========================================================
-- 3) Seed atualizado dos 3 planos.
-- =========================================================
update public.plans set
  max_ai_reads = 10,
  max_pdf_downloads = 10,
  max_child_churches = 1,
  allowed_import_formats = '{csv}',
  allow_strict_mode = false
where name = 'free';

update public.plans set
  max_ai_reads = 60,
  max_pdf_downloads = 50,
  max_child_churches = 10,
  allowed_import_formats = '{csv,pdf,ofx,image}',
  allow_strict_mode = true
where name = 'pro';

update public.plans set
  max_ai_reads = -1,
  max_pdf_downloads = -1,
  max_child_churches = -1,
  allowed_import_formats = '{csv,pdf,ofx,image}',
  allow_strict_mode = true
where name = 'unlimited';

-- =========================================================
-- 4) create_child_church(): corrige a checagem de limite para usar
-- max_child_churches com sentinela -1 = ilimitado, e permitir exatamente
-- N igrejas filhas (antes bloqueava com N-1).
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
  v_parent_of_parent uuid;
  v_max_child_churches integer;
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
    select max_child_churches into v_max_child_churches from public.plans where id = v_plan_id;
    select count(*) into v_children_count from public.churches where parent_church_id = p_parent_church_id;
    if v_max_child_churches <> -1 and v_children_count >= v_max_child_churches then
      raise exception 'Limite de igrejas filhas do plano atual atingido';
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
