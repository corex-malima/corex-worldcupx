-- 08_functions_predictions.sql
-- Guardado de predicciones, deadline y generación base de tablas/llaves.

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
    p_penalty_winner_team_id uuid default null
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

    if v_match.stage <> 'GROUP' and p_home_score = p_away_score and p_penalty_winner_team_id is null then
        raise exception 'En eliminatorias empatadas debe elegir ganador por penales.';
    end if;

    if p_home_score > p_away_score then v_winner := v_match.home_team_id;
    elsif p_home_score < p_away_score then v_winner := v_match.away_team_id;
    else v_winner := p_penalty_winner_team_id;
    end if;

    insert into public.prediction_match_scores (prediction_id, match_id, stage, home_team_id, away_team_id, home_score, away_score, penalty_winner_team_id, winner_team_id)
    values (v_prediction.id, p_match_id, v_match.stage, v_match.home_team_id, v_match.away_team_id, p_home_score, p_away_score, p_penalty_winner_team_id, v_winner)
    on conflict (prediction_id, match_id) do update set
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        penalty_winner_team_id = excluded.penalty_winner_team_id,
        winner_team_id = excluded.winner_team_id,
        updated_at = now();

    perform public.build_predicted_group_standings(p_ticket_id);

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

    -- Versión base: guarda clasificados 1.º y 2.º por grupo como slots simbólicos.
    -- TODO: completar matriz oficial 48 equipos/R32 con mejores terceros cuando se cargue fixture oficial.
    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, team_id, source)
    select v_prediction_id, 'R32', position::text || group_code, team_id, 'predicted_group_standings'
    from public.predicted_group_standings
    where prediction_id = v_prediction_id and position <= 2;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id, 'todo', 'Completar matriz oficial de dieciseisavos y mejores terceros.');
end;
$$;
