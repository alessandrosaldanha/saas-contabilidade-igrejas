-- Permite lançamento manual (criação/edição direta) no Livro Caixa e audita
-- edições da mesma forma que insert/estorno já são (trigger, não depende do
-- frontend lembrar de logar).

create or replace function public.log_transaction_update()
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
    'Edição Manual',
    format('%s: R$ %s (%s)', case when old.type = 'entrada' then 'Entrada' else 'Saída' end, old.value, old.category),
    format('%s: R$ %s (%s)', case when new.type = 'entrada' then 'Entrada' else 'Saída' end, new.value, new.category),
    public.request_ip(),
    public.request_device()
  );
  return new;
end;
$$;

drop trigger if exists on_transaction_update on public.transactions;
create trigger on_transaction_update
  after update on public.transactions
  for each row execute function public.log_transaction_update();
