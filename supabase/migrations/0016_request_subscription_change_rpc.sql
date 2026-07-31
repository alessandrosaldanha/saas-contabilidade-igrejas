-- RPC do botão "Já fiz o Pix / Notificar Admin" (PixPaymentModal): cria a
-- solicitação em payment_requests e marca a igreja como pending_approval numa
-- única transação. Precisa ser SECURITY DEFINER porque Admin/Tesoureiro não
-- têm (e não deveriam ter) permissão de UPDATE direto em `churches` — só o
-- master tem, via churches_update_master (migration 0009).
create or replace function public.request_subscription_change(p_plan_id uuid, p_billing_cycle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id uuid;
begin
  if not public.has_role(array['Admin', 'Tesoureiro']) then
    raise exception 'Apenas Admin ou Tesoureiro podem solicitar troca de plano';
  end if;
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'Ciclo de cobrança inválido: %', p_billing_cycle;
  end if;

  v_church_id := public.current_church_id();
  if v_church_id is null then
    raise exception 'Usuário sem igreja associada';
  end if;

  insert into public.payment_requests (church_id, user_id, plan_id, billing_cycle)
  values (v_church_id, auth.uid(), p_plan_id, p_billing_cycle);

  update public.churches set subscription_status = 'pending_approval' where id = v_church_id;
end;
$$;

grant execute on function public.request_subscription_change(uuid, text) to authenticated;
