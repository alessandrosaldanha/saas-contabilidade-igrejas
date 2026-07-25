-- Reforça o RBAC: usuário com status "Inativo" deixa de conseguir fazer
-- qualquer leitura/escrita no banco, mesmo que ainda tenha uma sessão/token
-- válido do Supabase Auth em algum navegador. Antes desta migration, nenhuma
-- policy/RLS checava a coluna `status` — só a `role` importava (via
-- has_role()) ou, em várias tabelas, nem isso (só `auth.role() = 'authenticated'`).

-- has_role() agora também exige status <> 'Inativo'. Como toda policy de
-- escrita (transactions/import_history insert/update/delete) e a checagem
-- is_admin() já usam has_role(), essa única mudança já bloqueia usuários
-- inativos em todas elas, sem precisar tocar em cada policy individualmente.
create or replace function public.has_role(roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(roles) and status <> 'Inativo'
  );
$$;

-- Helper para as policies de SELECT (e o insert de audit_logs) que hoje só
-- exigem "está autenticado" — não checam role nem status.
create or replace function public.is_active()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select status <> 'Inativo' from public.profiles where id = auth.uid()),
    false
  );
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_active" on public.profiles
  for select using (public.is_active());

drop policy if exists "transactions_select_authenticated" on public.transactions;
create policy "transactions_select_active" on public.transactions
  for select using (public.is_active());

drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;
create policy "audit_logs_select_active" on public.audit_logs
  for select using (public.is_active());

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_active" on public.audit_logs
  for insert with check (public.is_active());

drop policy if exists "import_history_select_authenticated" on public.import_history;
create policy "import_history_select_active" on public.import_history
  for select using (public.is_active());

-- Realtime na tabela profiles: o AuthContext do frontend assina o próprio
-- registro (filtrado por id) para saber, em tempo real, quando um Admin (em
-- qualquer outra sessão/navegador) marcar o usuário como Inativo, e forçar o
-- logout imediatamente em vez de esperar a próxima renovação de token.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
