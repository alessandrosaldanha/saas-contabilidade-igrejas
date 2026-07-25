-- Termos de Uso e Responsabilidade: aceite obrigatório no primeiro acesso.
-- Isenta a plataforma de responsabilidade por vazamento de dados decorrente de
-- mau uso do usuário (compartilhamento de credenciais, senha fraca, malware no
-- dispositivo) e por inconsistências em relatórios originadas de dados/arquivos
-- incorretos enviados pelo próprio usuário. Texto completo em
-- src/components/TermsAcceptanceModal.tsx — TERMS_VERSION ali precisa
-- corresponder à versão gravada por accept_terms() abaixo.

-- =========================================================
-- 1) profiles: coluna rápida para checagem no frontend (evita um round-trip
-- extra só para saber se o modal bloqueante precisa aparecer).
-- =========================================================
alter table public.profiles
  add column termo_aceito boolean not null default false;

-- =========================================================
-- 2) termo_aceite_registros: histórico imutável de aceites, um registro por
-- aceite (não por usuário) — mesmo padrão append-only de audit_logs, sem
-- policy de UPDATE/DELETE (nega por padrão).
-- =========================================================
create table public.termo_aceite_registros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  versao_termo varchar not null,
  data_aceite timestamptz not null default now(),
  ip_usuario varchar,
  user_agent text,
  church_id uuid references public.churches (id)
);

alter table public.termo_aceite_registros enable row level security;

-- Cada usuário vê o próprio histórico de aceite; Admin/Auditor/Conselho Fiscal
-- veem os da própria igreja (auditabilidade); Master vê tudo.
create policy "termo_aceite_registros_select" on public.termo_aceite_registros
  for select using (
    public.is_master()
    or user_id = auth.uid()
    or (public.has_role(array['Admin', 'Auditor', 'Conselho Fiscal']) and church_id = public.current_church_id())
  );

-- Defesa em profundidade: a escrita real acontece via accept_terms() (RPC
-- SECURITY DEFINER), mas mantém a mesma policy explícita já usada em
-- audit_logs para qualquer tentativa de insert direto pela API.
create policy "termo_aceite_registros_insert_own" on public.termo_aceite_registros
  for insert with check (user_id = auth.uid());

-- =========================================================
-- 3) audit_logs: novo action_key para o aceite também aparecer na trilha
-- geral de auditoria (tela /auditoria), além do registro dedicado acima.
-- =========================================================
alter table public.audit_logs drop constraint audit_logs_action_key_check;
alter table public.audit_logs add constraint audit_logs_action_key_check
  check (action_key = any (array['categorizacao_ia', 'edicao_manual', 'aprovacao_caixa', 'estorno', 'acesso', 'aceite_termos']));

-- =========================================================
-- 4) accept_terms(): única forma de registrar o aceite — grava o histórico
-- imutável, ativa a flag rápida em profiles e loga na trilha geral.
-- =========================================================
create or replace function public.accept_terms(p_versao_termo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_church uuid;
begin
  select role, church_id into actor_role, actor_church from public.profiles where id = auth.uid();

  if actor_role is null then
    raise exception 'Perfil não encontrado';
  end if;
  if p_versao_termo is null or trim(p_versao_termo) = '' then
    raise exception 'Versão do termo inválida';
  end if;

  insert into public.termo_aceite_registros (user_id, versao_termo, ip_usuario, user_agent, church_id)
  values (auth.uid(), trim(p_versao_termo), public.request_ip(), public.request_device(), actor_church);

  update public.profiles set termo_aceito = true where id = auth.uid();

  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device, church_id)
  values (
    auth.uid(),
    actor_role,
    'aceite_termos',
    'Aceite dos Termos de Uso',
    'Termo não aceito',
    format('Termo v%s aceito', trim(p_versao_termo)),
    public.request_ip(),
    public.request_device(),
    actor_church
  );
end;
$$;

grant execute on function public.accept_terms(text) to authenticated;
