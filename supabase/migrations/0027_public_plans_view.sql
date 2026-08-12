-- View pública do catálogo de planos, para a landing page ("/", fora de
-- autenticação) consultar direto o mesmo dado que /planos usa, sem duplicar
-- conteúdo estático no front. Nunca inclui dados bancários/Pix (bank_name/
-- account_holder/account_document/pix_key/pix_qr_code_url) — esses só
-- existem no checkout de /planos (PixPaymentModal), que continua lendo
-- `plans` direto (já autenticado).
--
-- Views não têm RLS própria (RLS é por tabela) — o controle de acesso aqui é
-- por COLUNA (a view só seleciona as públicas) + GRANT explícito pro role
-- anon. Como a view roda com as permissões do seu dono (quem aplica esta
-- migration, dono/superuser em relação a `plans`), ela ignora a policy de
-- linha `plans_select_authenticated` automaticamente — a tabela `plans` e
-- essa policy permanecem exatamente como estão, sem nenhuma alteração.
--
-- Substituída pela migration 0028 (função SECURITY DEFINER): o advisor de
-- segurança do Supabase classifica uma view SECURITY DEFINER exposta ao
-- anon como ERROR — mesmo sendo um falso-positivo aqui (catálogo global sem
-- dado por igreja), preferimos o padrão de função SECURITY DEFINER já usado
-- no projeto, que o mesmo advisor classifica como WARN.
create view public.public_plans as
select
  id,
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  features,
  max_ai_reads,
  max_csv_rows_daily,
  max_child_churches,
  max_pdf_downloads,
  allowed_import_formats,
  allow_strict_mode
from public.plans;

grant select on public.public_plans to anon, authenticated;
