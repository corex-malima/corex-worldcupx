-- 10_functions_scoring.sql
-- Scoring oficial alineado con docs/12-plan-cierre-mundial.md sección 2.1.
-- Reglas:
--   Marcador exacto (grupo y eliminatoria): +3
--   Resultado correcto (1X2 o avance): +1
--   Posición exacta en grupo (1.º/2.º/3.º): +1 por equipo
--   Cruce correcto por ronda (par de equipos, sin orden): +1
--   Selección que avanza por ronda: R32=1, R16=2, QF=3, SF=4
--   Campeón: +10
--   Tercer puesto: +5

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
    where p.prediction_id = v_prediction_id and p.position in (1, 2, 3);

    get diagnostics v_points = row_count;
    return coalesce(v_points, 0);
end;
$$;

-- score_bracket_crosses: +1 por cada par de equipos (sin importar orden) que coincida entre
-- el partido oficial y el predicho, para cada ronda R32..FINAL.
create or replace function public.score_bracket_crosses(p_ticket_id uuid)
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
    select p_ticket_id, 'cross', m.stage || ':' || m.match_no::text, 1,
           jsonb_build_object(
             'match_no', m.match_no,
             'stage', m.stage,
             'actual', jsonb_build_array(m.home_team_id, m.away_team_id),
             'prediction', jsonb_build_array(s.home_team_id, s.away_team_id)
           )
    from public.matches m
    join public.prediction_match_scores s on s.match_id = m.id and s.prediction_id = v_prediction_id
    where m.stage in ('R32', 'R16', 'QF', 'SF', 'FINAL', 'THIRD_PLACE')
      and m.home_team_id is not null and m.away_team_id is not null
      and s.home_team_id is not null and s.away_team_id is not null
      and (
          (m.home_team_id = s.home_team_id and m.away_team_id = s.away_team_id) or
          (m.home_team_id = s.away_team_id and m.away_team_id = s.home_team_id)
      );

    get diagnostics v_points = row_count;
    return coalesce(v_points, 0);
end;
$$;

-- score_advancement: para cada equipo que avanza realmente desde una ronda K (ganador del partido
-- en la ronda K), si el usuario predijo que ese equipo avanzaba desde esa ronda K, suma puntos
-- según la ronda: R32=1, R16=2, QF=3, SF=4.
create or replace function public.score_advancement(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    v_points int := 0;
    v_prediction_id uuid;
    v_round text;
    v_round_points int;
    v_added int;
begin
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return 0; end if;

    for v_round, v_round_points in
        select * from (values ('R32', 1), ('R16', 2), ('QF', 3), ('SF', 4)) as r(round, pts)
    loop
        with actual_winners as (
            select distinct m.winner_team_id as team_id
            from public.matches m
            where m.stage = v_round and m.status = 'official' and m.winner_team_id is not null
        ), predicted_winners as (
            select distinct s.winner_team_id as team_id
            from public.prediction_match_scores s
            join public.matches m on m.id = s.match_id
            where s.prediction_id = v_prediction_id and m.stage = v_round and s.winner_team_id is not null
        ), correct as (
            select a.team_id from actual_winners a
            join predicted_winners p on p.team_id = a.team_id
        )
        insert into public.score_details (ticket_id, category, item_ref, points, detail)
        select p_ticket_id, 'advancement', v_round || ':' || t.fifa_code, v_round_points,
               jsonb_build_object('round', v_round, 'team', t.name)
        from correct c join public.teams t on t.id = c.team_id;

        get diagnostics v_added = row_count;
        v_points := v_points + v_added * v_round_points;
    end loop;

    return v_points;
end;
$$;

create or replace function public.score_champion_bonus(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prediction_id uuid;
    v_pred_champion uuid;
    v_actual_champion uuid;
begin
    select id, champion_team_id into v_prediction_id, v_pred_champion
    from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return 0; end if;

    -- Si el cliente no envió champion_team_id, fallback al winner predicho del partido 104.
    if v_pred_champion is null then
        select s.winner_team_id into v_pred_champion
        from public.prediction_match_scores s
        join public.matches m on m.id = s.match_id
        where s.prediction_id = v_prediction_id and m.stage = 'FINAL';
    end if;

    select m.winner_team_id into v_actual_champion
    from public.matches m
    where m.stage = 'FINAL' and m.status = 'official' limit 1;

    if v_pred_champion is null or v_actual_champion is null then return 0; end if;
    if v_pred_champion <> v_actual_champion then return 0; end if;

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    values (p_ticket_id, 'champion_bonus', 'FINAL', 10, jsonb_build_object('champion', v_actual_champion));

    return 10;
end;
$$;

create or replace function public.score_third_place_bonus(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prediction_id uuid;
    v_pred_third uuid;
    v_actual_third uuid;
begin
    select id, third_place_team_id into v_prediction_id, v_pred_third
    from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return 0; end if;

    if v_pred_third is null then
        select s.winner_team_id into v_pred_third
        from public.prediction_match_scores s
        join public.matches m on m.id = s.match_id
        where s.prediction_id = v_prediction_id and m.stage = 'THIRD_PLACE';
    end if;

    select m.winner_team_id into v_actual_third
    from public.matches m
    where m.stage = 'THIRD_PLACE' and m.status = 'official' limit 1;

    if v_pred_third is null or v_actual_third is null then return 0; end if;
    if v_pred_third <> v_actual_third then return 0; end if;

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    values (p_ticket_id, 'third_place_bonus', 'THIRD_PLACE', 5, jsonb_build_object('third', v_actual_third));

    return 5;
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
    v_knockout_match_points int := 0;
    v_cross_points int := 0;
    v_advancement_points int := 0;
    v_champion_bonus int := 0;
    v_third_place_bonus int := 0;
    v_exact_count int := 0;
    v_result_count int := 0;
    v_total int := 0;
begin
    if not public.is_admin() then
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

    -- group_match: marcador (exacto +3 o resultado +1).
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

    -- knockout_match: mismo cálculo (+3 exacto, +1 resultado).
    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'knockout_match', m.stage || ':' || m.match_no::text,
           public.score_match(m.home_score, m.away_score, s.home_score, s.away_score),
           jsonb_build_object(
               'match_no', m.match_no,
               'stage', m.stage,
               'actual', jsonb_build_object('home', m.home_score, 'away', m.away_score),
               'prediction', jsonb_build_object('home', s.home_score, 'away', s.away_score)
           )
    from public.prediction_match_scores s
    join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id
      and m.stage in ('R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL')
      and m.status = 'official';

    select coalesce(sum(points), 0) into v_knockout_match_points from public.score_details where ticket_id = p_ticket_id and category = 'knockout_match';

    -- exact/result counts globales (todas las rondas oficiales).
    select count(*) into v_exact_count
    from public.prediction_match_scores s join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.status = 'official'
      and m.home_score = s.home_score and m.away_score = s.away_score;

    select count(*) into v_result_count
    from public.prediction_match_scores s join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.status = 'official'
      and public.score_match(m.home_score, m.away_score, s.home_score, s.away_score) > 0;

    v_group_position_points := public.score_group_positions(p_ticket_id);
    v_cross_points          := public.score_bracket_crosses(p_ticket_id);
    v_advancement_points    := public.score_advancement(p_ticket_id);
    v_champion_bonus        := public.score_champion_bonus(p_ticket_id);
    v_third_place_bonus     := public.score_third_place_bonus(p_ticket_id);

    v_total := v_group_match_points
             + v_knockout_match_points
             + v_group_position_points
             + v_cross_points
             + v_advancement_points
             + v_champion_bonus
             + v_third_place_bonus;

    insert into public.ticket_scores (
        ticket_id, total_points, group_match_points, group_position_points, knockout_points,
        cross_points, advancement_points, champion_bonus, runner_up_bonus, exact_count, result_count, calculated_at
    ) values (
        p_ticket_id, v_total, v_group_match_points, v_group_position_points, v_knockout_match_points,
        v_cross_points, v_advancement_points, v_champion_bonus, v_third_place_bonus, v_exact_count, v_result_count, now()
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

grant execute on function public.score_match(int, int, int, int) to authenticated;
grant execute on function public.score_group_positions(uuid) to authenticated;
grant execute on function public.score_bracket_crosses(uuid) to authenticated;
grant execute on function public.score_advancement(uuid) to authenticated;
grant execute on function public.score_champion_bonus(uuid) to authenticated;
grant execute on function public.score_third_place_bonus(uuid) to authenticated;
grant execute on function public.recalculate_ticket_score(uuid) to authenticated;
grant execute on function public.recalculate_all_scores() to authenticated;
