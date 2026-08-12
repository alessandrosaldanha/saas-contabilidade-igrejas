-- Novo action_key dedicado para a Fase 2 de correção do fluxo de senha:
-- quando o Master define a senha de um usuário diretamente (sem link/e-mail),
-- essa ação é sensível o bastante (o Master literalmente sabe a senha por um
-- instante) para merecer destaque próprio na Trilha de Auditoria, em vez de
-- cair no genérico 'edicao_manual' — mesmo racional já usado para
-- 'aceite_termos' na migration 0011.
alter table public.audit_logs drop constraint audit_logs_action_key_check;
alter table public.audit_logs add constraint audit_logs_action_key_check
  check (action_key = any (array['categorizacao_ia', 'edicao_manual', 'aprovacao_caixa', 'estorno', 'acesso', 'aceite_termos', 'definicao_senha_direta']));
