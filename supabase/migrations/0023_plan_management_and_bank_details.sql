-- Expande `plans` para edição completa pelo Admin Master direto no Painel de
-- Governança: descrição/benefícios de marketing (hoje só existiam como texto
-- computado em `planFeatures()` no front) e os dados bancários/Pix de
-- recebimento (hoje hardcoded em `PixPaymentModal.tsx`, únicos para todos os
-- planos). Também libera `UPDATE` do catálogo pelo client (só para master) e
-- cria o bucket de Storage para os QR Codes.

-- =========================================================
-- 1) Novas colunas.
-- =========================================================
alter table public.plans
  add column description text not null default '',
  add column features text[] not null default '{}',
  add column bank_name text,
  add column account_holder text,
  add column account_document text,
  add column pix_key text,
  add column pix_qr_code_url text;

-- =========================================================
-- 2) Seed de description/features com a cópia que já era gerada
-- dinamicamente em planFeatures() (PricingPlans.tsx) — vira o ponto de
-- partida editável pelo master, sem regressão visual na tela /planos.
-- Dados bancários ficam em branco de propósito (nenhum dado real de
-- pagamento deve ser inventado por uma migration) — o master preenche pelo
-- novo formulário antes do primeiro checkout Pix real.
-- =========================================================
update public.plans set
  description = 'Para começar a organizar as finanças da sua igreja sem custo.',
  features = array[
    '10 leituras por IA / mês',
    'Importação de extrato via CSV',
    '10 PDFs / mês',
    '1 Igreja Matriz + 1 Subcongregação',
    'Modo Estrito de Categorização: Não'
  ]
where name = 'free';

update public.plans set
  description = 'Para igrejas locais que já têm subcongregações e querem automatizar a contabilidade.',
  features = array[
    '60 leituras por IA / mês',
    'Importação em qualquer formato (PDF, OFX, CSV, Imagens)',
    '50 PDFs / mês',
    '1 Igreja Matriz + até 10 Subcongregações',
    'Modo Estrito de Categorização: Sim'
  ]
where name = 'pro';

update public.plans set
  description = 'Para presbitérios e redes de igrejas com subcongregações ilimitadas.',
  features = array[
    'Leituras por IA Ilimitadas',
    'Importação em qualquer formato',
    'PDFs Ilimitados',
    'Subcongregações Ilimitadas',
    'Modo Estrito de Categorização: Sim'
  ]
where name = 'unlimited';

-- =========================================================
-- 3) RLS: master edita o catálogo direto pelo client (mesmo padrão de
-- `churches_update_master`) — sem policy de INSERT/DELETE, os 3 planos
-- continuam fixos, só o conteúdo de cada um passa a ser editável.
-- =========================================================
create policy "plans_update_master" on public.plans
  for update using (public.is_master()) with check (public.is_master());

-- =========================================================
-- 4) Storage: bucket público para os QR Codes Pix (a imagem é exibida no
-- checkout sem exigir login) — upload/edição/remoção só pelo master.
-- =========================================================
insert into storage.buckets (id, name, public)
values ('plan-assets', 'plan-assets', true)
on conflict (id) do nothing;

create policy "plan_assets_select_public" on storage.objects
  for select using (bucket_id = 'plan-assets');

create policy "plan_assets_insert_master" on storage.objects
  for insert with check (bucket_id = 'plan-assets' and public.is_master());

create policy "plan_assets_update_master" on storage.objects
  for update using (bucket_id = 'plan-assets' and public.is_master())
  with check (bucket_id = 'plan-assets' and public.is_master());

create policy "plan_assets_delete_master" on storage.objects
  for delete using (bucket_id = 'plan-assets' and public.is_master());
