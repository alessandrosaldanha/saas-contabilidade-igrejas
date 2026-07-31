-- create_child_church() (migration 0019) já bloqueia a criação de uma "neta"
-- por esse caminho, mas o master reatribui "Igreja Mãe" via UPDATE direto em
-- churches (churches_update_master, sem RPC) — um caminho que a RPC não cobre.
-- Um trigger no banco garante a regra de hierarquia de só 2 níveis
-- (matriz → filhas, sem netos) não importa por qual caminho a escrita
-- aconteça, mesmo caminhos futuros que ainda não existem hoje.
create or replace function public.prevent_grandchild_church()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_of_parent uuid;
begin
  if new.parent_church_id is not null then
    -- o novo pai já é, ele mesmo, uma igreja filha? isso criaria uma neta.
    select parent_church_id into v_parent_of_parent from public.churches where id = new.parent_church_id;
    if v_parent_of_parent is not null then
      raise exception 'Não é possível vincular uma igreja como filha de outra igreja filha (hierarquia de só 2 níveis)';
    end if;

    -- esta própria igreja já tem filhas? virar filha de alguém transformaria
    -- as filhas dela em netas por tabela.
    if exists (select 1 from public.churches where parent_church_id = new.id) then
      raise exception 'Esta igreja já possui igrejas filhas — não é possível torná-la filha de outra igreja';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_church_prevent_grandchild on public.churches;
create trigger on_church_prevent_grandchild
  before insert or update of parent_church_id on public.churches
  for each row execute function public.prevent_grandchild_church();
