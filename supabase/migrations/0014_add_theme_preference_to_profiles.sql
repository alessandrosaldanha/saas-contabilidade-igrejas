-- Persiste a preferência de tema (claro/escuro) do usuário em profiles.theme,
-- sincronizada entre dispositivos via Supabase em vez de só localStorage.

alter table public.profiles
  add column theme text not null default 'dark' check (theme in ('light', 'dark'));

-- Não existe policy de UPDATE em profiles (só profiles_select_active) — um
-- usuário não pode dar update direto na própria linha via client, então o
-- toggle de tema precisa passar por uma RPC SECURITY DEFINER dedicada, no
-- mesmo padrão de update_own_profile (nome/e-mail), em vez de abrir uma
-- policy de UPDATE genérica que deixaria o usuário alterar colunas
-- sensíveis (role, status, church_id) da própria linha.
create or replace function public.update_own_theme(new_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_theme not in ('light', 'dark') then
    raise exception 'Tema inválido: %', new_theme;
  end if;

  update public.profiles
  set theme = new_theme
  where id = auth.uid();
end;
$$;
