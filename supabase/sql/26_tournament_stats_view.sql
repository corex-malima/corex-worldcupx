-- 26_tournament_stats_view.sql
-- View agregada y pública (anon + authenticated) con contadores globales
-- para mostrar progreso en dashboards motivacionales (incentivo de premios).
-- Idempotente.

create or replace view public.v_tournament_stats as
select
  count(*) filter (where status <> 'cancelled')::int as total_tickets_sold,
  count(*) filter (where status = 'claimed')::int as total_tickets_claimed,
  count(*) filter (where status = 'sold')::int as total_tickets_pending,
  count(*) filter (where status = 'cancelled')::int as total_tickets_cancelled
from public.tickets;

grant select on public.v_tournament_stats to anon, authenticated;

notify pgrst, 'reload schema';
