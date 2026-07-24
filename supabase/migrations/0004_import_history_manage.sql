-- Permite editar (nome do arquivo, mês/ano de referência, quantidade) e excluir
-- registros de import_history direto da tela de Importação. Segue o mesmo padrão
-- já usado em transactions: RLS restringe quem pode escrever, um trigger audita
-- a alteração (não depende do frontend lembrar de logar).

create policy "import_history_update_treasury" on public.import_history
  for update using (public.has_role(array['Admin', 'Tesoureiro']));

create policy "import_history_delete_admin" on public.import_history
  for delete using (public.is_admin());

create or replace function public.log_import_history_update()
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
    'Edição de Importação',
    format('%s (%s, %s lançamentos)', old.filename, old.month_label, old.count),
    format('%s (%s, %s lançamentos)', new.filename, new.month_label, new.count),
    public.request_ip(),
    public.request_device()
  );
  return new;
end;
$$;

drop trigger if exists on_import_history_update on public.import_history;
create trigger on_import_history_update
  after update on public.import_history
  for each row execute function public.log_import_history_update();

create or replace function public.log_import_history_delete()
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
    'Exclusão de Importação',
    format('%s (%s, %s lançamentos)', old.filename, old.month_label, old.count),
    null,
    public.request_ip(),
    public.request_device()
  );
  return old;
end;
$$;

drop trigger if exists on_import_history_delete on public.import_history;
create trigger on_import_history_delete
  after delete on public.import_history
  for each row execute function public.log_import_history_delete();
