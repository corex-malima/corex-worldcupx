-- 10_functions_scoring.sql
-- Scoring base auditable. Algunas reglas avanzadas quedan como TODO técnico.

create or replace function public.score_match(
    p_actual_home int,
    p_actual_away int,
    p_pred_home int,
    p_pred_away int
)
returns int
language sql
immutable
as $$
    select case
        when p_actual_home is null or p_actual_away is null or p_pred_home is null or p_pred_away is null then 0
        when p_actual_home = p_pred_home and p_actual_away = p_pred_away then 3
        when sign(p_actual_home - p_actual_away) = sign(p_pred_home - p_pred_away) then 1
        else 0
    end;
$$;

create or replace function public.score_group_positions(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    v_points int := 0;
    v_prediction_id uuid;
begin
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return 0; end if;

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'group_position', p.group_code || ':' || t.fifa_code, 1,
           jsonb_build_object('group_code', p.group_code, 'team', t.name, 'position', p.position)
    from public.predicted_group_standings p
    join public.actual_group_standings a on a.group_code = p.group_code and a.team_id = p.team_id and a.position = p.position
    join public.teams t on t.id = p.team_id
    where p.prediction_id = v_prediction_id;

    get diagnostics v_points = row_count;
    return coalesce(v_points, 0);
end;
$$;

create or replace function public.score_bracket_crosses(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
    -- TODO técnico: comparar pares reales vs predichos por stage/match cuando el bracket oficial esté completo.
    -- Debe sumar +1 por cruce correcto, sin importar local/visitante.
    return 0;
end;
$$;

create or replace function public.score_advancement(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
    -- TODO técnico: comparar selecciones que avanzan por ronda, aunque no coincida rival/cruce.
    -- Debe sumar +1 por cada avance correcto de selección.
    return 0;
end;
$$;

create or replace function public.recalculate_ticket_score(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ticket public.tickets%rowtype;
    v_prediction_id uuid;
    v_group_match_points int := 0;
    v_group_position_points int := 0;
    v_knockout_points int := 0;
    v_cross_points int := 0;
    v_advancement_points int := 0;
    v_champion_bonus int := 0;
    v_runner_up_bonus int := 0;
    v_exact_count int := 0;
    v_result_count int := 0;
    v_total int := 0;
begin
    if not public.is_admin() then
        -- También permite al propietario recalcular su ticket si ya hay resultados.
        if not exists (select 1 from public.tickets where id = p_ticket_id and claimed_by_user_id = auth.uid()) then
            raise exception 'Sin permisos para recalcular este ticket.';
        end if;
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id;
    if not found then raise exception 'Ticket no encontrado.'; end if;

    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then
        insert into public.ticket_scores (ticket_id, total_points, calculated_at)
        values (p_ticket_id, 0, now())
        on conflict (ticket_id) do update set total_points = 0, calculated_at = now();
        return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id, 'total_points', 0);
    end if;

    delete from public.score_details where ticket_id = p_ticket_id;

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'group_match', m.match_no::text,
           public.score_match(m.home_score, m.away_score, s.home_score, s.away_score) as points,
           jsonb_build_object(
               'match_no', m.match_no,
               'actual', jsonb_build_object('home', m.home_score, 'away', m.away_score),
               'prediction', jsonb_build_object('home', s.home_score, 'away', s.away_score)
           )
    from public.prediction_match_scores s
    join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id
      and m.stage = 'GROUP'
      and m.status = 'official';

    select coalesce(sum(points), 0) into v_group_match_points from public.score_details where ticket_id = p_ticket_id and category = 'group_match';

    select count(*) into v_exact_count
    from public.prediction_match_scores s join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.status = 'official'
      and m.home_score = s.home_score and m.away_score = s.away_score;

    select count(*) into v_result_count
    from public.prediction_match_scores s join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.status = 'official'
      and public.score_match(m.home_score, m.away_score, s.home_score, s.away_score) > 0;

    v_group_position_points := public.score_group_positions(p_ticket_id);
    v_cross_points := public.score_bracket_crosses(p_ticket_id);
    v_advancement_points := public.score_advancement(p_ticket_id);

    -- TODO: champion_bonus y runner_up_bonus cuando actual_bracket_slots tenga FINAL completo.
    v_total := v_group_match_points + v_group_position_points + v_knockout_points + v_cross_points + v_advancement_points + v_champion_bonus + v_runner_up_bonus;

    insert into public.ticket_scores (
        ticket_id, total_points, group_match_points, group_position_points, knockout_points,
        cross_points, advancement_points, champion_bonus, runner_up_bonus, exact_count, result_count, calculated_at
    ) values (
        p_ticket_id, v_total, v_group_match_points, v_group_position_points, v_knockout_points,
        v_cross_points, v_advancement_points, v_champion_bonus, v_runner_up_bonus, v_exact_count, v_result_count, now()
    ) on conflict (ticket_id) do update set
        total_points = excluded.total_points,
        group_match_points = excluded.group_match_points,
        group_position_points = excluded.group_position_points,
        knockout_points = excluded.knockout_points,
        cross_points = excluded.cross_points,
        advancement_points = excluded.advancement_points,
        champion_bonus = excluded.champion_bonus,
        runner_up_bonus = excluded.runner_up_bonus,
        exact_count = excluded.exact_count,
        result_count = excluded.result_count,
        calculated_at = now();

    return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id, 'total_points', v_total);
end;
$$;

create or replace function public.recalculate_all_scores()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ticket record;
    v_count int := 0;
begin
    if not public.is_admin() then raise exception 'Solo admin puede recalcular todos los scores.'; end if;

    for v_ticket in select id from public.tickets where status <> 'cancelled' loop
        perform public.recalculate_ticket_score(v_ticket.id);
        v_count := v_count + 1;
    end loop;

    return jsonb_build_object('ok', true, 'tickets_recalculated', v_count);
end;
$$;
