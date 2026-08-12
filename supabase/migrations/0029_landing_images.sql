-- Imagens de produto editáveis pelo Admin Master direto no Painel de
-- Governança (aba nova "Landing Page"), mesmo padrão de `plan-assets`/`plans`
-- (migration 0023): bucket de Storage dedicado + tabela com uma linha por
-- seção/chave da landing. Diferente de `plans`, aqui não há nenhuma coluna
-- sensível (só a URL pública da imagem), então o SELECT é liberado direto na
-- tabela para o `anon` — sem precisar de uma RPC/view intermediária como
-- `get_public_plans()`.

-- =========================================================
-- 1) Tabela: uma linha fixa por seção da landing.
-- =========================================================
create table public.landing_images (
  key text primary key,
  image_url text,
  updated_at timestamptz not null default now()
);

alter table public.landing_images enable row level security;

-- Seed das 6 seções que hoje ganham imagem na landing (Hero + 4 cards de
-- "Como Funciona" + "Sobre Nós") — todas em branco até o master enviar a
-- primeira imagem pelo Painel de Governança.
insert into public.landing_images (key) values
  ('hero'),
  ('feature_livro_caixa'),
  ('feature_ia'),
  ('feature_multi_igreja'),
  ('feature_auditoria'),
  ('sobre_nos')
on conflict (key) do nothing;

-- =========================================================
-- 2) RLS: leitura pública (a landing é servida sem autenticação), escrita
-- só pelo master — mesmo padrão de `plans_update_master`.
-- =========================================================
create policy "landing_images_select_public" on public.landing_images
  for select using (true);

create policy "landing_images_insert_master" on public.landing_images
  for insert with check (public.is_master());

create policy "landing_images_update_master" on public.landing_images
  for update using (public.is_master())
  with check (public.is_master());

create policy "landing_images_delete_master" on public.landing_images
  for delete using (public.is_master());

-- =========================================================
-- 3) Storage: bucket público dedicado, separado de `plan-assets` (nunca
-- misturar assets institucionais da landing com dados operacionais/checkout).
-- =========================================================
insert into storage.buckets (id, name, public)
values ('landing-images', 'landing-images', true)
on conflict (id) do nothing;

create policy "landing_images_assets_select_public" on storage.objects
  for select using (bucket_id = 'landing-images');

create policy "landing_images_assets_insert_master" on storage.objects
  for insert with check (bucket_id = 'landing-images' and public.is_master());

create policy "landing_images_assets_update_master" on storage.objects
  for update using (bucket_id = 'landing-images' and public.is_master())
  with check (bucket_id = 'landing-images' and public.is_master());

create policy "landing_images_assets_delete_master" on storage.objects
  for delete using (bucket_id = 'landing-images' and public.is_master());
