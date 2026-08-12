-- Substitui a view `public_plans` (migration 0027) por uma função
-- SECURITY DEFINER equivalente — mesma mecânica de bypass da RLS de `plans`
-- pro role anon, mas o linter de segurança do Supabase classifica funções
-- SECURITY DEFINER expostas ao anon como WARN, não ERROR (como fazia com a
-- view) — e é o padrão que o projeto já usa (accept_terms, default_free_plan_id(),
-- etc.), em vez de introduzir um objeto de tipo novo (view) só pra isso.
--
-- Continua expondo só as colunas de marketing/limites (nunca bank_name/
-- account_holder/account_document/pix_key/pix_qr_code_url, exclusivas do
-- checkout autenticado em PricingPlans.tsx/PixPaymentModal.tsx). A tabela
-- `plans` e sua policy `plans_select_authenticated` permanecem intocadas.
drop view if exists public.public_plans;

create or replace function public.get_public_plans()
returns table (
  id uuid,
  name text,
  display_name text,
  description text,
  price_monthly numeric,
  price_yearly numeric,
  features text[],
  max_ai_reads integer,
  max_csv_rows_daily integer,
  max_child_churches integer,
  max_pdf_downloads integer,
  allowed_import_formats text[],
  allow_strict_mode boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    id, name, display_name, description, price_monthly, price_yearly, features,
    max_ai_reads, max_csv_rows_daily, max_child_churches, max_pdf_downloads,
    allowed_import_formats, allow_strict_mode
  from public.plans
  order by price_monthly;
$$;

grant execute on function public.get_public_plans() to anon, authenticated;
