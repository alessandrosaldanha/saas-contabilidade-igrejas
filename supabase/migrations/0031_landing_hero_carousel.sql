-- Carrossel de imagens do Hero: o Hero passa a suportar múltiplas imagens
-- (1:N), diferente das demais seções da landing, que continuam 1:1 em
-- `landing_images` (migration 0029). Tabela dedicada em vez de generalizar
-- `landing_images` inteira para 1:N — só o Hero precisa de carrossel hoje,
-- e forçar `display_order`/reordenação nas seções que são sempre 1 imagem
-- só (ex.: `sobre_nos`) seria complexidade permanente sem uso real.

-- =========================================================
-- 1) Tabela: N linhas para o Hero, ordenadas por display_order.
-- =========================================================
create table public.landing_hero_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landing_hero_images enable row level security;

-- =========================================================
-- 2) RLS: leitura pública só das imagens ativas (a landing é servida sem
-- autenticação); o master também lê as inativas para gerenciá-las no
-- painel. Escrita só pelo master — mesmo padrão de `landing_images`.
-- =========================================================
create policy "landing_hero_images_select_public" on public.landing_hero_images
  for select using (is_active = true);

create policy "landing_hero_images_select_master" on public.landing_hero_images
  for select using (public.is_master());

create policy "landing_hero_images_insert_master" on public.landing_hero_images
  for insert with check (public.is_master());

create policy "landing_hero_images_update_master" on public.landing_hero_images
  for update using (public.is_master())
  with check (public.is_master());

create policy "landing_hero_images_delete_master" on public.landing_hero_images
  for delete using (public.is_master());

-- =========================================================
-- 3) Migra a imagem do Hero já cadastrada em `landing_images` (se houver)
-- como a primeira imagem do carrossel — não perde o que o master já tinha
-- subido antes desta migration.
-- =========================================================
insert into public.landing_hero_images (image_url, display_order)
select image_url, 0
from public.landing_images
where key = 'hero' and image_url is not null;

-- =========================================================
-- 4) Remove as chaves que a landing pública nunca leu — bug de UX
-- enganosa: o master subia a imagem pelos 4 cards de "Como Funciona" no
-- Painel de Governança e ela nunca aparecia no site (a seção usa um grid
-- de ícones fixo desde uma rodada anterior) — e a própria 'hero', que
-- migrou para `landing_hero_images` no passo acima.
-- =========================================================
delete from public.landing_images
where key in ('hero', 'feature_livro_caixa', 'feature_ia', 'feature_multi_igreja', 'feature_auditoria');
