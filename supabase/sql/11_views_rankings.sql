-- 11_views_rankings.sql
-- Vistas de ranking sin exponer cédula completa ni códigos completos.

create or replace view public.v_ranking_public as
select
    row_number() over (order by coalesce(ts.total_points, 0) desc, coalesce(ts.exact_count, 0) desc, t.created_at asc)::int as rank,
    t.id as ticket_id,
    'Ticket ' || left(t.code, 2) || '••••' as alias,
    e.person_name as employee_name,
    e.area_id,
    coalesce(ts.total_points, 0)::int as points,
    coalesce(ts.exact_count, 0)::int as exact_count,
    coalesce(ts.result_count, 0)::int as result_count,
    (coalesce(ts.group_position_points,0) + coalesce(ts.cross_points,0) + coalesce(ts.advancement_points,0) + coalesce(ts.champion_bonus,0) + coalesce(ts.runner_up_bonus,0))::int as bonus_points,
    coalesce(ph.status, 'pending') as status
from public.tickets t
join public.employees e on e.id = t.employee_id
left join public.ticket_scores ts on ts.ticket_id = t.id
left join public.prediction_headers ph on ph.ticket_id = t.id
where t.status <> 'cancelled';

create or replace view public.v_ranking_by_area as
select
    area_id,
    count(*)::int as tickets,
    round(avg(points)::numeric, 2) as avg_points,
    max(points)::int as max_points
from public.v_ranking_public
group by area_id;

create or replace view public.v_ticket_score_breakdown as
select
    sd.ticket_id,
    sd.category,
    sd.item_ref,
    sd.points,
    sd.detail,
    sd.created_at
from public.score_details sd;

create or replace view public.v_my_tickets as
select
    t.id,
    left(t.code, 2) || '••••' as "codeMasked",
    t.status,
    coalesce(ph.status, 'pending') as "predictionStatus",
    coalesce(ts.total_points, 0) as points,
    e.person_name as "ownerName",
    e.area_id as "areaId",
    t.claimed_at as "claimedAt"
from public.tickets t
join public.employees e on e.id = t.employee_id
left join public.prediction_headers ph on ph.ticket_id = t.id
left join public.ticket_scores ts on ts.ticket_id = t.id
where t.claimed_by_user_id = auth.uid();
