-- Backfill do repositório: esta migration já estava aplicada em produção
-- (via MCP apply_migration, nome remoto "add_update_own_profile_rpc") mas
-- nunca tinha sido salva como arquivo local. Recriada aqui verbatim, sem
-- nenhuma mudança de comportamento — RPC usada pelo ProfileSettingsModal
-- para o próprio usuário editar nome/e-mail.

create or replace function public.update_own_profile(new_name text, new_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_name text;
  old_email text;
  actor_role text;
begin
  select name, email, role into old_name, old_email, actor_role
  from public.profiles
  where id = auth.uid();

  if old_name is null then
    raise exception 'Perfil não encontrado';
  end if;

  if new_name is null or trim(new_name) = '' then
    raise exception 'Nome não pode ficar em branco';
  end if;

  if new_email is null or trim(new_email) = '' then
    raise exception 'E-mail não pode ficar em branco';
  end if;

  update public.profiles
  set name = trim(new_name),
      email = trim(new_email)
  where id = auth.uid();

  if old_name is distinct from trim(new_name) or old_email is distinct from trim(new_email) then
    insert into public.audit_logs (user_id, role, action_key, action_label, before, after, ip, device)
    values (
      auth.uid(),
      coalesce(actor_role, 'Admin'),
      'edicao_manual',
      'Edição Manual',
      'Nome: ' || old_name || ' · E-mail: ' || old_email,
      'Nome: ' || trim(new_name) || ' · E-mail: ' || trim(new_email),
      public.request_ip(),
      public.request_device()
    );
  end if;
end;
$$;

grant execute on function public.update_own_profile(text, text) to authenticated;
