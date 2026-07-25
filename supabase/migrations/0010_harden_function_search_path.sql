-- Hardening apontado pelo advisor de segurança do Supabase (function_search_path_mutable):
-- request_ip()/request_device() não tinham `search_path` fixo. Nenhuma das duas
-- referencia tabela/função sem qualificar o schema (só current_setting(), built-in),
-- então não havia um vetor de exploração de fato — mas fixar o search_path é uma
-- boa prática padrão para toda função SECURITY DEFINER/STABLE do projeto, e essas
-- duas eram as únicas sem essa proteção.

create or replace function public.request_ip()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  headers json;
begin
  headers := nullif(current_setting('request.headers', true), '')::json;
  return coalesce(headers ->> 'x-forwarded-for', headers ->> 'x-real-ip', '—');
exception when others then
  return '—';
end;
$$;

create or replace function public.request_device()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  headers json;
begin
  headers := nullif(current_setting('request.headers', true), '')::json;
  return coalesce(headers ->> 'user-agent', '—');
exception when others then
  return '—';
end;
$$;
