-- 17_v0_1_3_admin_search_and_filters.sql
-- v0.1.3:
--   * v_admin_tickets: vista para la tabla admin con alias "Ticket N" por colaborador,
--     conteo de grupos predichos (para gatear PDF KO) y el código real.
--   * v_ranking_public: agrega job_classification_code para que el frontend filtre.
--
-- Idempotente. Re-ejecutar no rompe nada.

-- =============================================================================
-- v_admin_tickets: vista admin con alias y predicción status
-- =============================================================================
create or replace view public.v_admin_tickets as
with numbered as (
    select t.*, row_number() over (partition by t.employee_id order by t.created_at)::int as ticket_seq
    from public.tickets t
),
group_counts as (
    select s.prediction_id, count(*)::int as groups_filled
    from public.prediction_match_scores s
    where s.stage = 'GROUP' and s.home_score is not null and s.away_score is not null
    group by s.prediction_id
)
select
    t.id,
    t.code,
    'Ticket ' || t.ticket_seq::text as alias,
    t.status,
    t.cedula,
    t.person_name,
    t.area_id,
    t.area_name,
    t.job_title,
    t.job_classification_code,
    t.created_at,
    t.claimed_at,
    coalesce(ph.status, 'pending') as prediction_status,
    coalesce(gc.groups_filled, 0) as groups_filled,
    coalesce(ts.total_points, 0)::int as points
from numbered t
left join public.prediction_headers ph on ph.ticket_id = t.id
left join group_counts gc on gc.prediction_id = ph.id
left join public.ticket_scores ts on ts.ticket_id = t.id;

-- =============================================================================
-- v_ranking_public: añade columnas area_name y job_classification_code
-- NOTA: PostgreSQL no permite cambiar el orden/cantidad de columnas con
-- "create or replace view". Usamos drop+create con cascade porque
-- v_ranking_by_area depende de esta view.
-- =============================================================================
drop view if exists public.v_ranking_by_area cascade;
drop view if exists public.v_ranking_public cascade;
create view public.v_ranking_public as
with numbered as (
    select t.*, row_number() over (partition by t.employee_id order by t.created_at)::int as ticket_seq
    from public.tickets t
    where t.status <> 'cancelled'
)
select
    row_number() over (order by coalesce(ts.total_points, 0) desc, coalesce(ts.exact_count, 0) desc, t.created_at asc)::int as rank,
    t.id as ticket_id,
    'Ticket ' || t.ticket_seq::text as alias,
    e.person_name as employee_name,
    e.area_id,
    e.area_name,
    e.job_classification_code,
    coalesce(ts.total_points, 0)::int as points,
    coalesce(ts.exact_count, 0)::int as exact_count,
    coalesce(ts.result_count, 0)::int as result_count,
    (coalesce(ts.group_position_points,0) + coalesce(ts.cross_points,0) + coalesce(ts.advancement_points,0) + coalesce(ts.champion_bonus,0) + coalesce(ts.runner_up_bonus,0))::int as bonus_points,
    coalesce(ph.status, 'pending') as status
from numbered t
join public.employees e on e.id = t.employee_id
left join public.ticket_scores ts on ts.ticket_id = t.id
left join public.prediction_headers ph on ph.ticket_id = t.id;

-- Recreamos v_ranking_by_area que fue dropeado por cascade.
create view public.v_ranking_by_area as
select
    area_id,
    count(*)::int as tickets,
    round(avg(points)::numeric, 2) as avg_points,
    max(points)::int as max_points
from public.v_ranking_public
group by area_id;

-- =============================================================================
-- Helper para debug: estado del sistema en una sola query
-- =============================================================================
create or replace view public.v_admin_system_status as
select
    (select count(*) from public.tickets where status = 'sold')::int as tickets_sold,
    (select count(*) from public.tickets where status = 'claimed')::int as tickets_claimed,
    (select count(*) from public.tickets where status = 'cancelled')::int as tickets_cancelled,
    (select count(*) from public.prediction_headers where status = 'submitted')::int as predictions_submitted,
    (select count(*) from public.matches where status = 'official' and stage = 'GROUP')::int as group_results_loaded,
    (select count(*) from public.matches where status = 'official' and stage <> 'GROUP')::int as knockout_results_loaded,
    (select count(*) from public.ticket_scores where total_points > 0)::int as tickets_with_points,
    (select max(calculated_at) from public.ticket_scores) as last_score_calc;

grant select on public.v_admin_tickets to authenticated;
grant select on public.v_ranking_public to anon, authenticated;
grant select on public.v_ranking_by_area to authenticated;
grant select on public.v_admin_system_status to authenticated;
