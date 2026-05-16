-- 09_functions_actual_results.sql
-- Carga de resultados reales, cálculo de tablas oficiales y resolución del bracket oficial.

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

    if v_match.stage <> 'GROUP' and v_match.home_team_id is null then
        raise exception 'Aún no se ha resuelto el equipo local. Carga primero los resultados pendientes.';
    end if;

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
    perform public.resolve_actual_knockout_teams();
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

    -- 'where true' es necesario porque Supabase bloquea DELETE sin WHERE clause.
    delete from public.actual_group_standings where true;

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

-- resolve_actual_knockout_teams: una vez la fase de grupos está completa (y reglas opcionales
-- para mejores terceros vía r32_third_place_rules), llena home_team_id/away_team_id
-- en cada match R32..FINAL leyendo home_slot/away_slot.
create or replace function public.resolve_actual_knockout_teams()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_match record;
    v_team_id uuid;
    v_rounds text[] := array['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];
    v_round text;
begin
    if not public.is_admin() then raise exception 'Solo admin puede resolver el bracket oficial.'; end if;

    foreach v_round in array v_rounds loop
        for v_match in
            select id, match_no, stage, home_slot, away_slot, home_team_id, away_team_id, status
            from public.matches
            where stage = v_round
            order by match_no
        loop
            -- Home
            if v_match.home_team_id is null and v_match.home_slot is not null and v_match.status <> 'official' then
                v_team_id := public.resolve_slot_to_team(v_match.match_no, 'home', v_match.home_slot);
                if v_team_id is not null then
                    update public.matches set home_team_id = v_team_id, updated_at = now() where id = v_match.id;
                end if;
            end if;
            -- Away
            if v_match.away_team_id is null and v_match.away_slot is not null and v_match.status <> 'official' then
                v_team_id := public.resolve_slot_to_team(v_match.match_no, 'away', v_match.away_slot);
                if v_team_id is not null then
                    update public.matches set away_team_id = v_team_id, updated_at = now() where id = v_match.id;
                end if;
            end if;
        end loop;
    end loop;

    return jsonb_build_object('ok', true);
end;
$$;

-- resolve_slot_to_team: dado un slot textual (e.g. '1A', '2B', '3A/B/C/D/F', 'Ganador Partido 73',
-- 'Perdedor Partido 101'), devuelve el team_id correspondiente o null si todavía no está resuelto.
create or replace function public.resolve_slot_to_team(p_match_no int, p_side text, p_slot text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_slot text := trim(coalesce(p_slot, ''));
    v_team_id uuid;
    v_position int;
    v_group text;
    v_src_no int;
    v_src_winner uuid;
    v_src_home uuid;
    v_src_away uuid;
    v_allowed text[];
    v_best_thirds text[];
    v_third_group text;
begin
    if v_slot = '' then return null; end if;

    -- 1X / 2X — posición fija + grupo.
    if v_slot ~ '^[12][A-L]$' then
        v_position := substring(v_slot from 1 for 1)::int;
        v_group := substring(v_slot from 2 for 1);
        select team_id into v_team_id
        from public.actual_group_standings
        where group_code = v_group and position = v_position;
        return v_team_id;
    end if;

    -- 3X/Y/Z... — mejor tercero entre los grupos permitidos. Usa r32_third_place_rules.
    if v_slot like '3%' then
        select allowed_groups into v_allowed from public.r32_third_place_rules where match_no = p_match_no;
        if v_allowed is null then return null; end if;

        -- Mejores 8 terceros según criterios FIFA: puntos desc, DG desc, GF desc.
        with thirds as (
            select s.group_code, s.team_id, s.points, s.goal_difference, s.goals_for
            from public.actual_group_standings s
            where s.position = 3
            order by s.points desc, s.goal_difference desc, s.goals_for desc, s.group_code asc
            limit 8
        )
        select array_agg(group_code order by group_code) into v_best_thirds from thirds;

        if v_best_thirds is null then return null; end if;

        -- Aplica el orden FIFA: para los 8 R32 con 3.º, el orden alfabético del grupo permitido
        -- define qué tercero clasifica a qué partido. Implementación: filtramos los mejores 8 terceros
        -- por allowed_groups y nos quedamos con el primero del orden de allowed_groups.
        for v_third_group in
            select unnest(v_allowed) order by 1
        loop
            if v_third_group = any (v_best_thirds) then
                select team_id into v_team_id from public.actual_group_standings
                where group_code = v_third_group and position = 3;
                return v_team_id;
            end if;
        end loop;
        return null;
    end if;

    -- "Ganador Partido N" — winner_team_id del partido N.
    if v_slot ~* '^Ganador Partido [0-9]+$' then
        v_src_no := (regexp_match(v_slot, '([0-9]+)'))[1]::int;
        select winner_team_id into v_src_winner from public.matches where match_no = v_src_no;
        return v_src_winner;
    end if;

    -- "Perdedor Partido N" — equipo que NO ganó.
    if v_slot ~* '^Perdedor Partido [0-9]+$' then
        v_src_no := (regexp_match(v_slot, '([0-9]+)'))[1]::int;
        select home_team_id, away_team_id, winner_team_id
          into v_src_home, v_src_away, v_src_winner
        from public.matches where match_no = v_src_no;
        if v_src_winner is null then return null; end if;
        if v_src_winner = v_src_home then return v_src_away; end if;
        return v_src_home;
    end if;

    return null;
end;
$$;

-- build_actual_bracket: materializa los slots oficiales (1.º/2.º por grupo, 3.º clasificados,
-- y ganadores oficiales por ronda).
create or replace function public.build_actual_bracket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then raise exception 'Solo admin puede construir bracket oficial.'; end if;

    delete from public.actual_bracket_slots where true;

    -- 1.º y 2.º por grupo.
    insert into public.actual_bracket_slots (stage, slot_code, team_id, source)
    select 'R32', position::text || group_code, team_id, 'actual_group_standings'
    from public.actual_group_standings
    where position <= 2;

    -- Mejores 8 terceros (slot_code = '3' || group_code).
    insert into public.actual_bracket_slots (stage, slot_code, team_id, source)
    select 'R32', '3' || group_code, team_id, 'actual_group_standings_best_thirds'
    from (
        select group_code, team_id
        from public.actual_group_standings
        where position = 3
        order by points desc, goal_difference desc, goals_for desc, group_code asc
        limit 8
    ) best;

    -- Ganadores oficiales por ronda.
    insert into public.actual_bracket_slots (stage, slot_code, match_id, team_id, source)
    select m.stage, 'W' || m.match_no::text, m.id, m.winner_team_id, 'matches'
    from public.matches m
    where m.stage in ('R32', 'R16', 'QF', 'SF', 'FINAL') and m.winner_team_id is not null;

    return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.save_actual_result(uuid, int, int, uuid) to authenticated;
grant execute on function public.recalculate_actual_group_standings() to authenticated;
grant execute on function public.resolve_actual_knockout_teams() to authenticated;
grant execute on function public.resolve_slot_to_team(int, text, text) to authenticated;
grant execute on function public.build_actual_bracket() to authenticated;
