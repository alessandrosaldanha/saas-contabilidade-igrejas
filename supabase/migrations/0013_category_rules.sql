-- Regras de mapeamento (De-Para) por igreja: guarda associações palavra-chave
-- (fornecedor/descrição) → categoria contábil, para reaproveitar categorizações
-- já validadas pela tesouraria em importações futuras (Modo Estrito). Segue o
-- mesmo padrão de RLS/trigger já usado em transactions/import_history (0009/0012).
--
-- Aproveita também para migrar `transactions.category` da taxonomia antiga
-- (7 valores genéricos) para a nova taxonomia padronizada de contabilidade de
-- igreja (13 valores, separados por entrada/saída) usada em todo o app a partir
-- desta sessão (src/constants/accountingCategories.ts).

-- =========================================================
-- 1) Tabela category_rules
-- =========================================================
create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id),
  keyword text not null,
  type text not null check (type in ('entrada', 'saida')),
  category text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (church_id, keyword)
);

alter table public.category_rules enable row level security;

-- =========================================================
-- 2) sync_church_id: mesmo trigger de transactions/import_history (0012) —
-- sem isso, o mesmo bug de RLS "new row violates row-level security policy"
-- se repete aqui (church_id explícito divergente vindo do front).
-- =========================================================
create trigger sync_church_id_category_rules
  before insert or update on public.category_rules
  for each row execute function public.sync_church_id();

-- =========================================================
-- 3) RLS: leitura para qualquer usuário ativo da igreja; escrita restrita a
-- Admin/Tesoureiro (mesmo grupo que já importa/lança no Livro Caixa); master
-- sempre com bypass total (public.is_master()).
-- =========================================================
create policy "category_rules_select_active" on public.category_rules
  for select using (
    public.is_master() or (public.is_active() and church_id = public.current_church_id())
  );

create policy "category_rules_insert_treasury" on public.category_rules
  for insert with check (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

create policy "category_rules_update_treasury" on public.category_rules
  for update using (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  )
  with check (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

create policy "category_rules_delete_treasury" on public.category_rules
  for delete using (
    public.is_master() or (public.has_role(array['Admin', 'Tesoureiro']) and church_id = public.current_church_id())
  );

-- =========================================================
-- 4) Auditoria (mesmo molde de log_import_history_update/delete, 0004) —
-- toda regra criada/editada/excluída vira um registro em audit_logs,
-- sem depender do frontend lembrar de logar.
-- =========================================================
create or replace function public.log_category_rule_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (
    auth.uid(),
    coalesce(actor_role, 'Sistema'),
    'edicao_manual',
    'Regra de Categorização Criada',
    '—',
    format('%s (%s) → %s', new.keyword, new.type, new.category),
    public.request_ip(),
    public.request_device()
  );
  return new;
end;
$$;

drop trigger if exists on_category_rule_insert on public.category_rules;
create trigger on_category_rule_insert
  after insert on public.category_rules
  for each row execute function public.log_category_rule_insert();

create or replace function public.log_category_rule_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if new.* is not distinct from old.* then
    return new;
  end if;

  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (
    auth.uid(),
    coalesce(actor_role, 'Sistema'),
    'edicao_manual',
    'Regra de Categorização Editada',
    format('%s (%s) → %s', old.keyword, old.type, old.category),
    format('%s (%s) → %s', new.keyword, new.type, new.category),
    public.request_ip(),
    public.request_device()
  );
  return new;
end;
$$;

drop trigger if exists on_category_rule_update on public.category_rules;
create trigger on_category_rule_update
  after update on public.category_rules
  for each row execute function public.log_category_rule_update();

create or replace function public.log_category_rule_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
  values (
    auth.uid(),
    coalesce(actor_role, 'Sistema'),
    'edicao_manual',
    'Regra de Categorização Excluída',
    format('%s (%s) → %s', old.keyword, old.type, old.category),
    null,
    public.request_ip(),
    public.request_device()
  );
  return old;
end;
$$;

drop trigger if exists on_category_rule_delete on public.category_rules;
create trigger on_category_rule_delete
  after delete on public.category_rules
  for each row execute function public.log_category_rule_delete();

-- =========================================================
-- 5) Migra transactions.category da taxonomia antiga (genérica) para a nova
-- taxonomia de contabilidade de igreja — evita lançamentos já salvos ficarem
-- com uma categoria que sumiu do dropdown/CATEGORY_TONE.
--
-- Desliga sync_church_id_transactions temporariamente: essa migration roda
-- sem sessão de usuário autenticado (auth.uid() nulo), então o trigger
-- sobrescreveria church_id para NULL em vez de preservar o valor já gravado.
-- =========================================================
alter table public.transactions disable trigger sync_church_id_transactions;

update public.transactions set category = 'Dízimos' where category = 'Dízimos e Ofertas';
update public.transactions set category = 'Sustento Pastoral / Prebenda' where category = 'Prebenda Pastoral';
update public.transactions set category = 'Manutenção de Templo' where category = 'Manutenção do Templo';
update public.transactions set category = 'Ação Social / Auxílio' where category = 'Ação Social';
update public.transactions set category = 'Utilidades (Água, Luz, Internet)' where category = 'Contas e Utilidades';
update public.transactions set category = 'Despesas Administrativas' where category = 'Administrativo';
update public.transactions
  set category = case when type = 'entrada' then 'Outras Entradas' else 'Despesas Administrativas' end
  where category = 'Outros';

alter table public.transactions enable trigger sync_church_id_transactions;
