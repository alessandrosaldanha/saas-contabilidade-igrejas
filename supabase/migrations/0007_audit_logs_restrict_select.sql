-- Backfill do repositório: esta migration já estava aplicada em produção
-- (via MCP apply_migration, nome remoto "audit_logs_restrict_select_to_admin_auditor_conselho")
-- mas nunca tinha sido salva como arquivo local. Recriada aqui verbatim, sem
-- nenhuma mudança de comportamento, só para o repo voltar a refletir o estado
-- real do banco antes da migration de multi-tenant (0009).
--
-- Tesoureiro deixa de poder ler audit_logs (mesmo via chamada direta à API/REST)
-- — só Admin, Auditor e Conselho Fiscal.

drop policy if exists "audit_logs_select_active" on public.audit_logs;

create policy "audit_logs_select_admin_auditor_conselho" on public.audit_logs
  for select using (public.has_role(array['Admin', 'Auditor', 'Conselho Fiscal']));
