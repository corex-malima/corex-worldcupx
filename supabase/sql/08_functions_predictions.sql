-- 08_functions_predictions.sql
-- Guardado de predicciones, deadline, construcción de standings y bracket predicho.

create or replace function public.validate_deadline()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select now() < coalesce(
        (select (value->>'deadline_at')::timestamptz from public.app_config where key = 'prediction_deadline'),
        '2026-06-11 15:00:00-05'::timestamptz
    );
$$;

create or replace function public.save_prediction_match_score(
    p_ticket_id uuid,
    p_match_id uuid,
    p_home_score int,
    p_away_score int,
    p_penalty_winner_team_id uuid default null,
    p_home_team_id uuid default null,
    p_away_team_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_ticket public.tickets%rowtype;
    v_prediction public.prediction_headers%rowtype;
    v_match public.matches%rowtype;
    v_home_team uuid;
    v_away_team uuid;
    v_winner uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.validate_deadline() then raise exception 'La fecha límite ya pasó.'; end if;
    if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
        raise exception 'Marcadores inválidos.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status <> 'claimed' or v_ticket.claimed_by_user_id <> v_user then
        raise exception 'El ticket no está reclamado por este usuario.';
    end if;

    select * into v_match from public.matches where id = p_match_id;
    if not found then raise exception 'Partido no encontrado.'; end if;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_user, 'in_progress')
    on conflict (ticket_id) do update set status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end, updated_at = now()
    returning * into v_prediction;

    -- En fase de grupos los equipos vienen del fixture. En eliminatorias el usuario debe enviarlos.
    if v_match.stage = 'GROUP' then
        v_home_team := v_match.home_team_id;
        v_away_team := v_match.away_team_id;
    else
        v_home_team := coalesce(p_home_team_id, v_match.home_team_id);
        v_away_team := coalesce(p_away_team_id, v_match.away_team_id);
        if v_home_team is null or v_away_team is null then
            raise exception 'En eliminatorias debe enviar p_home_team_id y p_away_team_id.';
        end if;
    end if;

    if v_match.stage <> 'GROUP' and p_home_score = p_away_score and p_penalty_winner_team_id is null then
        raise exception 'En eliminatorias empatadas debe elegir ganador por penales.';
    end if;

    if p_home_score > p_away_score then v_winner := v_home_team;
    elsif p_home_score < p_away_score then v_winner := v_away_team;
    else v_winner := p_penalty_winner_team_id;
    end if;

    insert into public.prediction_match_scores (prediction_id, match_id, stage, home_team_id, away_team_id, home_score, away_score, penalty_winner_team_id, winner_team_id)
    values (v_prediction.id, p_match_id, v_match.stage, v_home_team, v_away_team, p_home_score, p_away_score, p_penalty_winner_team_id, v_winner)
    on conflict (prediction_id, match_id) do update set
        home_team_id = excluded.home_team_id,
        away_team_id = excluded.away_team_id,
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        penalty_winner_team_id = excluded.penalty_winner_team_id,
        winner_team_id = excluded.winner_team_id,
        updated_at = now();

    if v_match.stage = 'GROUP' then
        perform public.build_predicted_group_standings(p_ticket_id);
    end if;

    return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id, 'match_id', p_match_id);
end;
$$;

create or replace function public.submit_prediction(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.validate_deadline() then raise exception 'La fecha límite ya pasó.'; end if;

    update public.prediction_headers
    set status = 'submitted', submitted_at = now(), updated_at = now()
    where ticket_id = p_ticket_id and user_id = v_user;

    if not found then raise exception 'Predicción no encontrada.'; end if;

    return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id);
end;
$$;

create or replace function public.lock_predictions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count int;
begin
    if not public.is_admin() then raise exception 'Solo admin puede bloquear predicciones.'; end if;

    update public.prediction_headers
    set status = 'locked', locked_at = now(), updated_at = now()
    where status in ('pending', 'in_progress', 'submitted')
      and not public.validate_deadline();

    get diagnostics v_count = row_count;
    return jsonb_build_object('ok', true, 'locked', v_count);
end;
$$;

create or replace function public.build_predicted_group_standings(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prediction_id uuid;
begin
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then
        return jsonb_build_object('ok', false, 'message', 'No existe predicción.');
    end if;

    delete from public.predicted_group_standings where prediction_id = v_prediction_id;

    with team_base as (
        select t.id as team_id, t.group_code, t.seed_order
        from public.teams t
        where t.group_code is not null
    ), played as (
        select
            s.prediction_id,
            m.group_code,
            s.home_team_id as team_id,
            1 as played,
            case when s.home_score > s.away_score then 3 when s.home_score = s.away_score then 1 else 0 end as points,
            s.home_score as goals_for,
            s.away_score as goals_against
        from public.prediction_match_scores s
        join public.matches m on m.id = s.match_id
        where s.prediction_id = v_prediction_id and m.stage = 'GROUP'
        union all
        select
            s.prediction_id,
            m.group_code,
            s.away_team_id as team_id,
            1,
            case when s.away_score > s.home_score then 3 when s.home_score = s.away_score then 1 else 0 end,
            s.away_score,
            s.home_score
        from public.prediction_match_scores s
        join public.matches m on m.id = s.match_id
        where s.prediction_id = v_prediction_id and m.stage = 'GROUP'
    ), agg as (
        select
            tb.group_code,
            tb.team_id,
            coalesce(sum(p.played), 0)::int as played,
            coalesce(sum(p.points), 0)::int as points,
            coalesce(sum(p.goals_for), 0)::int as goals_for,
            coalesce(sum(p.goals_against), 0)::int as goals_against,
            tb.seed_order
        from team_base tb
        left join played p on p.team_id = tb.team_id
        group by tb.group_code, tb.team_id, tb.seed_order
    ), ranked as (
        select
            *,
            (goals_for - goals_against) as goal_difference,
            row_number() over (partition by group_code order by points desc, (goals_for - goals_against) desc, goals_for desc, seed_order asc) as position
        from agg
    )
    insert into public.predicted_group_standings (prediction_id, group_code, team_id, played, points, goals_for, goals_against, goal_difference, position)
    select v_prediction_id, group_code, team_id, played, points, goals_for, goals_against, goal_difference, position
    from ranked;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;

-- build_predicted_bracket: materializa los 32 slots (R32 e implícitamente los ganadores propagados).
-- Para R32:
--   * Slots 1X y 2X salen directamente de predicted_group_standings (position 1 y 2 por grupo).
--   * Slots de mejores terceros (3X/...) salen de prediction_third_place_assignments para cada match_no R32.
-- Para R16, QF, SF, FINAL, THIRD_PLACE: lee los ganadores predichos por partido en prediction_match_scores.
create or replace function public.build_predicted_bracket(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prediction_id uuid;
begin
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then raise exception 'Predicción no encontrada.'; end if;

    delete from public.predicted_bracket_slots where prediction_id = v_prediction_id;

    -- R32: 1.º y 2.º por grupo desde predicted_group_standings.
    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, team_id, source)
    select v_prediction_id, 'R32', position::text || group_code, team_id, 'predicted_group_standings'
    from public.predicted_group_standings
    where prediction_id = v_prediction_id and position <= 2;

    -- R32: 8 mejores terceros, vinculados a match_no R32 por prediction_third_place_assignments.
    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, match_id, team_id, source)
    select
        v_prediction_id,
        'R32',
        '3_' || m.match_no::text,
        m.id,
        a.team_id,
        'prediction_third_place_assignments'
    from public.prediction_third_place_assignments a
    join public.matches m on m.id = a.slot_match_id
    where a.prediction_id = v_prediction_id;

    -- Rondas posteriores: equipos clasificados por el ganador predicho de cada partido previo.
    -- R16: ganador del R32 que apunta a esa llave.
    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, match_id, team_id, source)
    select v_prediction_id, m.stage, 'W' || m.match_no::text, m.id, s.winner_team_id, 'prediction_match_scores'
    from public.matches m
    join public.prediction_match_scores s on s.match_id = m.id and s.prediction_id = v_prediction_id
    where m.stage in ('R32', 'R16', 'QF', 'SF', 'FINAL') and s.winner_team_id is not null;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;

-- Submit atómico: el cliente envía todo el draft en un solo payload jsonb.
-- payload: {
--   "group_scores":           [{ "match_id": uuid, "home_score": int, "away_score": int }, ...],
--   "third_place_assignments":[{ "slot_match_id": uuid, "team_id": uuid }, ...],
--   "knockout_matches":       [{ "match_id": uuid, "home_team_id": uuid, "away_team_id": uuid,
--                               "home_score": int, "away_score": int,
--                               "penalty_winner_team_id": uuid | null }, ...],
--   "champion_team_id":       uuid,
--   "third_place_team_id":    uuid | null
-- }
create or replace function public.submit_complete_prediction(
    p_ticket_id uuid,
    p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_ticket public.tickets%rowtype;
    v_prediction_id uuid;
    v_row jsonb;
    v_match public.matches%rowtype;
    v_home_team uuid;
    v_away_team uuid;
    v_home_score int;
    v_away_score int;
    v_penalty_winner uuid;
    v_winner uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.validate_deadline() then raise exception 'La fecha límite ya pasó.'; end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status <> 'claimed' or v_ticket.claimed_by_user_id <> v_user then
        raise exception 'El ticket no está reclamado por este usuario.';
    end if;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_user, 'in_progress')
    on conflict (ticket_id) do update set
        status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end,
        updated_at = now()
    returning id into v_prediction_id;

    -- Limpia drafts previos para esta predicción.
    delete from public.prediction_match_scores where prediction_id = v_prediction_id;
    delete from public.prediction_third_place_assignments where prediction_id = v_prediction_id;

    -- 1) Marcadores fase de grupos.
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'group_scores', '[]'::jsonb)) loop
        v_home_score := (v_row->>'home_score')::int;
        v_away_score := (v_row->>'away_score')::int;
        if v_home_score is null or v_away_score is null or v_home_score < 0 or v_away_score < 0 then
            raise exception 'Marcadores inválidos en grupos.';
        end if;

        select * into v_match from public.matches where id = (v_row->>'match_id')::uuid;
        if not found or v_match.stage <> 'GROUP' then
            raise exception 'Partido de grupo no válido.';
        end if;

        if v_home_score > v_away_score then v_winner := v_match.home_team_id;
        elsif v_home_score < v_away_score then v_winner := v_match.away_team_id;
        else v_winner := null;
        end if;

        insert into public.prediction_match_scores (prediction_id, match_id, stage, home_team_id, away_team_id, home_score, away_score, winner_team_id)
        values (v_prediction_id, v_match.id, v_match.stage, v_match.home_team_id, v_match.away_team_id, v_home_score, v_away_score, v_winner);
    end loop;

    -- Recalcula standings predichos (positions de cada grupo).
    perform public.build_predicted_group_standings(p_ticket_id);

    -- 2) Asignación de mejores terceros a slots R32.
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'third_place_assignments', '[]'::jsonb)) loop
        insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
        values (v_prediction_id, (v_row->>'slot_match_id')::uuid, (v_row->>'team_id')::uuid);
    end loop;

    -- 3) Eliminatorias: equipos resueltos y marcadores los envía el cliente.
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'knockout_matches', '[]'::jsonb)) loop
        v_home_score := (v_row->>'home_score')::int;
        v_away_score := (v_row->>'away_score')::int;
        if v_home_score is null or v_away_score is null or v_home_score < 0 or v_away_score < 0 then
            raise exception 'Marcadores inválidos en eliminatorias.';
        end if;

        select * into v_match from public.matches where id = (v_row->>'match_id')::uuid;
        if not found or v_match.stage = 'GROUP' then
            raise exception 'Partido de eliminatoria no válido.';
        end if;

        v_home_team := nullif(v_row->>'home_team_id', '')::uuid;
        v_away_team := nullif(v_row->>'away_team_id', '')::uuid;
        if v_home_team is null or v_away_team is null then
            raise exception 'Eliminatoria: los equipos home/away son obligatorios.';
        end if;

        v_penalty_winner := nullif(v_row->>'penalty_winner_team_id', '')::uuid;

        if v_home_score = v_away_score and v_penalty_winner is null then
            raise exception 'Eliminatoria empatada requiere ganador por penales.';
        end if;

        if v_home_score > v_away_score then v_winner := v_home_team;
        elsif v_home_score < v_away_score then v_winner := v_away_team;
        else v_winner := v_penalty_winner;
        end if;

        insert into public.prediction_match_scores (prediction_id, match_id, stage, home_team_id, away_team_id, home_score, away_score, penalty_winner_team_id, winner_team_id)
        values (v_prediction_id, v_match.id, v_match.stage, v_home_team, v_away_team, v_home_score, v_away_score, v_penalty_winner, v_winner);
    end loop;

    -- 4) Campeón y tercer puesto.
    update public.prediction_headers
    set champion_team_id   = nullif(p_payload->>'champion_team_id', '')::uuid,
        third_place_team_id = nullif(p_payload->>'third_place_team_id', '')::uuid,
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    where id = v_prediction_id;

    -- 5) Materializa bracket predicho.
    perform public.build_predicted_bracket(p_ticket_id);

    return jsonb_build_object(
        'ok', true,
        'ticket_id', p_ticket_id,
        'prediction_id', v_prediction_id,
        'group_count', jsonb_array_length(coalesce(p_payload->'group_scores', '[]'::jsonb)),
        'knockout_count', jsonb_array_length(coalesce(p_payload->'knockout_matches', '[]'::jsonb))
    );
end;
$$;

comment on function public.submit_complete_prediction(uuid, jsonb) is 'Submit atómico de toda la predicción (grupos + asignaciones de terceros + eliminatorias + campeón/3.º). Reemplaza save_prediction_match_score+submit_prediction si se prefiere un solo envío.';

grant execute on function public.save_prediction_match_score(uuid, uuid, int, int, uuid, uuid, uuid) to authenticated;
grant execute on function public.submit_prediction(uuid) to authenticated;
grant execute on function public.lock_predictions() to authenticated;
grant execute on function public.build_predicted_group_standings(uuid) to authenticated;
grant execute on function public.build_predicted_bracket(uuid) to authenticated;
grant execute on function public.submit_complete_prediction(uuid, jsonb) to authenticated;
