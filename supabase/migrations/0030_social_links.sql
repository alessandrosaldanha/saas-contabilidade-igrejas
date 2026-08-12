-- Redes sociais exibidas no footer da landing, editáveis pelo Admin Master
-- na aba "Landing Page" da Governança (mesma aba de `landing_images`, já que
-- ambas editam conteúdo da landing pública). Mesmo padrão de `landing_images`
-- (migration 0029): tabela com uma linha fixa por rede social (`platform`
-- como chave), só update pelo master — sem insert/delete expostos pela UI,
-- mantidos aqui só por paridade com o padrão já adotado.

-- =========================================================
-- 1) Tabela: uma linha fixa por rede social.
-- =========================================================
create table public.social_links (
  platform text primary key,
  url text,
  display_order integer not null default 0,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.social_links enable row level security;

-- Seed das 4 redes pré-cadastradas — todas inativas e sem URL até o master
-- preencher o link real e ativar pelo Painel de Governança.
insert into public.social_links (platform, display_order) values
  ('instagram', 0),
  ('facebook', 1),
  ('youtube', 2),
  ('whatsapp', 3)
on conflict (platform) do nothing;

-- =========================================================
-- 2) RLS: leitura pública só dos links ativos (a landing é servida sem
-- autenticação); o master também lê os inativos para gerenciá-los no painel.
-- Escrita só pelo master — mesmo padrão de `landing_images_update_master`.
-- =========================================================
create policy "social_links_select_public" on public.social_links
  for select using (is_active = true);

create policy "social_links_select_master" on public.social_links
  for select using (public.is_master());

create policy "social_links_insert_master" on public.social_links
  for insert with check (public.is_master());

create policy "social_links_update_master" on public.social_links
  for update using (public.is_master())
  with check (public.is_master());

create policy "social_links_delete_master" on public.social_links
  for delete using (public.is_master());
