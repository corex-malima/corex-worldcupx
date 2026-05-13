-- 09_functions_actual_results.sql
-- Carga de resultados reales y cálculo de tablas oficiales.

create or replace function public.save_actual_result(
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
    v_admin uuid := auth.uid();
    v_match public.matches%rowtype;
    v_winner uuid;
begin
    if v_admin is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.is_admin() then raise exception 'Solo admin puede guardar resultados.'; end if;
    if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
        raise exception 'Marcador inválido.';
    end if;

    select * into v_match from public.matches where id = p_match_id;
    if not found then raise exception 'Partido no encontrado.'; end if;

    if v_match.stage <> 'GROUP' and p_home_score = p_away_score and p_penalty_winner_team_id is null then
        raise exception 'En eliminatorias empatadas debe indicar ganador por penales.';
    end if;

    if p_home_score > p_away_score then v_winner := v_match.home_team_id;
    elsif p_home_score < p_away_score then v_winner := v_match.away_team_id;
    else v_winner := p_penalty_winner_team_id;
    end if;

    update public.matches
    set home_score = p_home_score,
        away_score = p_away_score,
        penalty_winner_team_id = p_penalty_winner_team_id,
        winner_team_id = v_winner,
        status = 'official',
        updated_at = now()
    where id = p_match_id;

    perform public.recalculate_actual_group_standings();
    perform public.build_actual_bracket();

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'save_actual_result', 'matches', p_match_id, jsonb_build_object('home_score', p_home_score, 'away_score', p_away_score));

    return jsonb_build_object('ok', true, 'match_id', p_match_id, 'winner_team_id', v_winner);
end;
$$;

create or replace function public.recalculate_actual_group_standings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then raise exception 'Solo admin puede recalcular tablas oficiales.'; end if;

    delete from public.actual_group_standings;

    with team_base as (
        select id as team_id, group_code, seed_order from public.teams where group_code is not null
    ), played as (
        select m.group_code, m.home_team_id as team_id, 1 as played,
               case when m.home_score > m.away_score then 3 when m.home_score = m.away_score then 1 else 0 end as points,
               m.home_score as goals_for, m.away_score as goals_against
        from public.matches m where m.stage = 'GROUP' and m.status = 'official'
        union all
        select m.group_code, m.away_team_id as team_id, 1,
               case when m.away_score > m.home_score then 3 when m.home_score = m.away_score then 1 else 0 end,
               m.away_score, m.home_score
        from public.matches m where m.stage = 'GROUP' and m.status = 'official'
    ), agg as (
        select tb.group_code, tb.team_id,
               coalesce(sum(p.played), 0)::int as played,
               coalesce(sum(p.points), 0)::int as points,
               coalesce(sum(p.goals_for), 0)::int as goals_for,
               coalesce(sum(p.goals_against), 0)::int as goals_against,
               tb.seed_order
        from team_base tb left join played p on p.team_id = tb.team_id
        group by tb.group_code, tb.team_id, tb.seed_order
    ), ranked as (
        select *, (goals_for - goals_against) as goal_difference,
               row_number() over (partition by group_code order by points desc, (goals_for - goals_against) desc, goals_for desc, seed_order asc) as position
        from agg
    )
    insert into public.actual_group_standings (group_code, team_id, played, points, goals_for, goals_against, goal_difference, position)
    select group_code, team_id, played, points, goals_for, goals_against, goal_difference, position from ranked;

    return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.build_actual_bracket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then raise exception 'Solo admin puede construir bracket oficial.'; end if;

    delete from public.actual_bracket_slots;

    -- Versión base: guarda clasificados oficiales 1.º y 2.º por grupo.
    -- TODO: completar matriz oficial de R32 y avance por ronda según fixture real.
    insert into public.actual_bracket_slots (stage, slot_code, team_id, source)
    select 'R32', position::text || group_code, team_id, 'actual_group_standings'
    from public.actual_group_standings
    where position <= 2;

    return jsonb_build_object('ok', true, 'todo', 'Completar bracket oficial cuando se cargue fixture completo.');
end;
$$;
