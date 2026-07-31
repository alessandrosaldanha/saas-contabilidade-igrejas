-- Planos de Assinatura, Autocadastro de Igreja e Governança de Pagamentos
-- (Pix manual + comprovante via WhatsApp + aprovação no Painel Master).
-- Introduz `plans`/`usage_counters`/`payment_requests`, associa `churches` a
-- um plano, relaxa a constraint de `profiles.church_id` para permitir o
-- estado transitório do autocadastro (usuário já existe, igreja ainda não) e
-- adiciona as RPCs que orquestram esse fluxo.

-- =========================================================
-- 1) Tabela plans + seed dos 3 planos padrão
-- =========================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  price_monthly numeric not null default 0.00,
  price_yearly numeric not null default 0.00,
  max_ai_reads integer not null default 0,
  max_csv_rows_daily integer not null default 20,
  max_churches integer not null default 1,
  max_pdf_downloads integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

insert into public.plans (name, display_name, price_monthly, price_yearly, max_ai_reads, max_csv_rows_daily, max_churches, max_pdf_downloads)
values
  ('free', 'Gratuito', 0.00, 0.00, 0, 20, 1, 1),
  ('pro', 'Igreja Local', 39.90, 390.00, 30, 999999, 1, 50),
  ('unlimited', 'Presbitério', 99.90, 990.00, 999999, 999999, 99, 999999);

-- =========================================================
-- 2) churches: plan_id (default = plano free) + subscription_status
-- =========================================================
create or replace function public.default_free_plan_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.plans where name = 'free' limit 1;
$$;

alter table public.churches
  add column plan_id uuid references public.plans (id) default public.default_free_plan_id(),
  add column subscription_status text not null default 'active'
    check (subscription_status in ('active', 'pending_approval', 'expired'));

update public.churches set plan_id = public.default_free_plan_id() where plan_id is null;

alter table public.churches alter column plan_id set not null;

-- =========================================================
-- 3) usage_counters: contador mensal por igreja (leituras de IA, PDFs)
-- =========================================================
create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  month_year text not null,
  ai_reads_count integer not null default 0,
  pdf_downloads_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (church_id, month_year)
);

alter table public.usage_counters enable row level security;

-- =========================================================
-- 4) payment_requests: solicitação de troca de plano via Pix manual
-- (user_id referencia profiles, não auth.users diretamente, para o
-- PostgREST conseguir embutir o nome do solicitante via join, igual já é
-- feito hoje com churches/plans em outras tabelas).
-- =========================================================
create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id),
  user_id uuid not null references public.profiles (id),
  plan_id uuid not null references public.plans (id),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.payment_requests enable row level security;

-- =========================================================
-- 5) profiles: relaxa a constraint church_id<->master para admitir o estado
-- transitório do autocadastro — o trigger handle_new_user() cria o profile
-- (status 'Convite Pendente' por padrão) ANTES da igreja existir; só depois
-- complete_self_signup() (abaixo) cria a igreja e preenche church_id.
-- =========================================================
alter table public.profiles drop constraint profiles_church_id_master_check;
alter table public.profiles add constraint profiles_church_id_master_check
  check (
    (role = 'master' and church_id is null)
    or (church_id is not null)
    or (role <> 'master' and church_id is null and status = 'Convite Pendente')
  );

-- =========================================================
-- 6) RPC: complete_self_signup — segunda etapa do autocadastro (chamada logo
-- após supabase.auth.signUp() já autenticar o novo usuário). Cria a igreja no
-- plano Free e vincula o profile recém-criado a ela.
-- =========================================================
create or replace function public.complete_self_signup(p_church_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_church uuid;
  v_church_id uuid;
begin
  select church_id into v_current_church from public.profiles where id = auth.uid();
  if v_current_church is not null then
    raise exception 'Cadastro já concluído para este usuário';
  end if;
  if p_church_name is null or trim(p_church_name) = '' then
    raise exception 'Informe o nome da igreja';
  end if;

  insert into public.churches (name, plan_id, subscription_status, cep, street, number, neighborhood, city, uf)
  values (trim(p_church_name), public.default_free_plan_id(), 'active', '', '', '', '', '', '')
  returning id into v_church_id;

  update public.profiles set church_id = v_church_id, status = 'Ativo' where id = auth.uid();
end;
$$;

grant execute on function public.complete_self_signup(text) to authenticated;

-- =========================================================
-- 7) RPC: increment_usage_counter — upsert atômico do contador mensal
-- (chamada pelo frontend após uma leitura de IA/exportação de PDF ter êxito).
-- Master opera sempre com p_church_id explícito (igreja em gestão, mesmo
-- padrão do sync_church_id() de transactions/import_history).
-- =========================================================
create or replace function public.increment_usage_counter(p_church_id uuid, p_counter text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
begin
  if not (public.is_master() or p_church_id = public.current_church_id()) then
    raise exception 'Sem permissão para registrar uso desta igreja';
  end if;
  if p_counter not in ('ai_reads', 'pdf_downloads') then
    raise exception 'Contador inválido: %', p_counter;
  end if;

  insert into public.usage_counters (church_id, month_year, ai_reads_count, pdf_downloads_count)
  values (
    p_church_id,
    v_month,
    case when p_counter = 'ai_reads' then 1 else 0 end,
    case when p_counter = 'pdf_downloads' then 1 else 0 end
  )
  on conflict (church_id, month_year) do update
  set ai_reads_count = public.usage_counters.ai_reads_count + case when p_counter = 'ai_reads' then 1 else 0 end,
      pdf_downloads_count = public.usage_counters.pdf_downloads_count + case when p_counter = 'pdf_downloads' then 1 else 0 end;
end;
$$;

grant execute on function public.increment_usage_counter(uuid, text) to authenticated;

-- =========================================================
-- 8) RPCs de governança: aprovar/rejeitar solicitação de assinatura (Pix).
-- Aprovar aplica o plano solicitado na igreja; rejeitar só destrava o status
-- (volta pra 'active' no plano atual, sem trocar plan_id).
-- =========================================================
create or replace function public.admin_approve_payment_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id uuid;
  v_plan_id uuid;
  v_status text;
begin
  if not public.is_master() then
    raise exception 'Apenas o Admin Master pode aprovar solicitações de assinatura';
  end if;

  select church_id, plan_id, status into v_church_id, v_plan_id, v_status
  from public.payment_requests where id = p_request_id;

  if v_church_id is null then
    raise exception 'Solicitação não encontrada';
  end if;
  if v_status <> 'pending' then
    raise exception 'Esta solicitação já foi processada';
  end if;

  update public.payment_requests set status = 'approved' where id = p_request_id;
  update public.churches set plan_id = v_plan_id, subscription_status = 'active' where id = v_church_id;
end;
$$;

create or replace function public.admin_reject_payment_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id uuid;
  v_status text;
begin
  if not public.is_master() then
    raise exception 'Apenas o Admin Master pode rejeitar solicitações de assinatura';
  end if;

  select church_id, status into v_church_id, v_status
  from public.payment_requests where id = p_request_id;

  if v_church_id is null then
    raise exception 'Solicitação não encontrada';
  end if;
  if v_status <> 'pending' then
    raise exception 'Esta solicitação já foi processada';
  end if;

  update public.payment_requests set status = 'rejected' where id = p_request_id;
  update public.churches set subscription_status = 'active' where id = v_church_id and subscription_status = 'pending_approval';
end;
$$;

grant execute on function public.admin_approve_payment_request(uuid) to authenticated;
grant execute on function public.admin_reject_payment_request(uuid) to authenticated;

-- =========================================================
-- 9) RLS
-- =========================================================

-- churches: além do bypass de master, cada usuário agora também enxerga a
-- própria igreja (necessário para o front consultar plano/limite/uso) — até
-- aqui só o master tinha select em churches.
create policy "churches_select_own" on public.churches
  for select using (id = public.current_church_id());

-- plans: catálogo público (sem dado sensível) para qualquer usuário autenticado.
create policy "plans_select_authenticated" on public.plans
  for select using (auth.uid() is not null);

-- usage_counters: só leitura, só da própria igreja (ou master) — toda escrita
-- passa por increment_usage_counter() (SECURITY DEFINER).
create policy "usage_counters_select_own" on public.usage_counters
  for select using (public.is_master() or church_id = public.current_church_id());

-- payment_requests: igreja enxerga as próprias solicitações; Admin/Tesoureiro
-- (ou master) cria; só master atualiza (aprovar/rejeitar), via RPC acima.
create policy "payment_requests_select_own" on public.payment_requests
  for select using (public.is_master() or church_id = public.current_church_id());

create policy "payment_requests_insert_own" on public.payment_requests
  for insert with check (
    public.is_master()
    or (church_id = public.current_church_id() and user_id = auth.uid() and public.has_role(array['Admin', 'Tesoureiro']))
  );

create policy "payment_requests_update_master" on public.payment_requests
  for update using (public.is_master()) with check (public.is_master());
