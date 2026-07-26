-- Corrige "new row violates row-level security policy for table transactions"
-- no fluxo de importação/lançamento manual. Causa raiz: a policy de INSERT
-- (transactions_insert_treasury/import_history_insert_treasury) exige
-- church_id = current_church_id() para Admin/Tesoureiro, mas o front dependia
-- de enviar `church_id: undefined` para o DEFAULT do banco resolver sozinho —
-- qualquer valor explícito divergente (ex.: estado stale de effectiveChurchId,
-- múltiplas abas, bug futuro no front) reproduz o erro (confirmado via SQL
-- direto: insert com church_id de outra igreja para um Tesoureiro dispara
-- exatamente essa mensagem).
--
-- Fix: BEFORE INSERT/UPDATE trigger força church_id = current_church_id() no
-- servidor para quem não é master, independente do que o client mandar — a
-- policy de RLS deixa de depender de omissão de campo no payload do front.
-- Para o master (sem igreja própria) mantém o valor explícito escolhido na
-- Sidebar, apenas validando que não veio nulo.

create or replace function public.sync_church_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    new.church_id := public.current_church_id();
  elsif new.church_id is null then
    raise exception 'Selecione a igreja em gestão antes de salvar.';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_church_id_transactions on public.transactions;
create trigger sync_church_id_transactions
  before insert or update on public.transactions
  for each row execute function public.sync_church_id();

drop trigger if exists sync_church_id_import_history on public.import_history;
create trigger sync_church_id_import_history
  before insert or update on public.import_history
  for each row execute function public.sync_church_id();
