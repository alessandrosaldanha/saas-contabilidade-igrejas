-- usePlanLimits.canAddChurch() precisa contar as igrejas filhas da própria
-- igreja (plano Presbitério permite múltiplas) para comparar com
-- plans.max_churches — a policy churches_select_own (migration 0015) só
-- cobria a própria linha, então esse count sempre voltava 0 para quem não é
-- master. Amplia para também enxergar as filhas diretas da própria igreja.
drop policy if exists "churches_select_own" on public.churches;
create policy "churches_select_own" on public.churches
  for select using (
    id = public.current_church_id() or parent_church_id = public.current_church_id()
  );
