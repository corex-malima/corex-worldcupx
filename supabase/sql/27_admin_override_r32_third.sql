-- 27_admin_override_r32_third.sql
-- Permite al admin FIJAR manualmente el equipo de un slot de tercero en R32 y
-- evita que el auto-resolver (resolve_actual_knockout_teams) lo sobrescriba.
--
-- Contexto: el bracket oficial de R32 lo arma la BD con un backtracking
-- (match_best_thirds_to_r32) que puede diferir de la asignación oficial FIFA.
-- El scoring lee los equipos de R32 desde `matches`, así que un tercero mal
-- ruteado corrompe los puntos. Esta migración da al admin el control final:
--   - admin_set_r32_third(): fija el equipo de un slot de tercero + marca third_locked.
--   - resolve_actual_knockout_teams(): NO toca slots con third_locked = true.
--   - admin_reset_r32_third_lock(): vuelve a automático (limpia candados + re-resuelve).
--
-- Idempotente y aditivo. No cambia el algoritmo de backtracking (queda como
-- primer borrador automático).

-- ---------------------------------------------------------------------------
-- a) Columna candado (aditiva, default false).
-- ---------------------------------------------------------------------------
alter table public.matches add column if not exists third_locked boolean not null default false;

-- ---------------------------------------------------------------------------
-- b) RPC admin: fijar el tercero de un slot R32 (home o away).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_r32_third(p_match_no int, p_side text, p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_match public.matches%rowtype;
begin
    if not public.is_admin() then raise exception 'Solo admin puede fijar terceros.'; end if;
    if p_team_id is null then raise exception 'Debe indicar el equipo.'; end if;

    select * into v_match from public.matches where match_no = p_match_no;
    if not found then raise exception 'Partido % no encontrado.', p_match_no; end if;
    if v_match.stage <> 'R32' then raise exception 'Solo se pueden fijar terceros en R32 (partido % es %).', p_match_no, v_match.stage; end if;
    if v_match.status = 'official' then raise exception 'El partido % ya es oficial; no se puede cambiar el equipo.', p_match_no; end if;

    if p_side = 'home' then
        if coalesce(v_match.home_slot, '') not like '3%' then
            raise exception 'El slot local del partido % no es de tercero (%).', p_match_no, v_match.home_slot;
        end if;
        update public.matches set home_team_id = p_team_id, third_locked = true, updated_at = now() where id = v_match.id;
    elsif p_side = 'away' then
        if coalesce(v_match.away_slot, '') not like '3%' then
            raise exception 'El slot visitante del partido % no es de tercero (%).', p_match_no, v_match.away_slot;
        end if;
        update public.matches set away_team_id = p_team_id, third_locked = true, updated_at = now() where id = v_match.id;
    else
        raise exception 'side inválido: % (debe ser home|away).', p_side;
    end if;

    return jsonb_build_object('ok', true, 'match_no', p_match_no, 'side', p_side, 'team_id', p_team_id);
end;
$$;

grant execute on function public.admin_set_r32_third(int, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- c) Re-crear resolve_actual_knockout_teams() con guard de third_locked.
--    Idéntica a 09_functions_actual_results.sql salvo:
--      + "and not coalesce(third_locked, false)" en los DOS update del batch.
-- ---------------------------------------------------------------------------
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
    v_best_thirds text[];
    v_third_assignment jsonb;
    v_match_no_text text;
    v_assigned_group text;
    v_team_id_for_third uuid;
begin
    if not public.is_admin() then raise exception 'Solo admin puede resolver el bracket oficial.'; end if;

    -- 1) BATCH: mejores 3°s con unicidad global
    with thirds_ranked as (
        select group_code from public.actual_group_standings
        where position = 3
        order by points desc, goal_difference desc, goals_for desc, group_code asc
        limit 8
    )
    select array_agg(group_code order by group_code) into v_best_thirds from thirds_ranked;

    if v_best_thirds is not null and coalesce(array_length(v_best_thirds, 1), 0) = 8 then
        v_third_assignment := public.match_best_thirds_to_r32(v_best_thirds);
        if v_third_assignment is not null then
            for v_match_no_text, v_assigned_group in select * from jsonb_each_text(v_third_assignment) loop
                select team_id into v_team_id_for_third
                from public.actual_group_standings
                where group_code = v_assigned_group and position = 3;

                update public.matches
                set home_team_id = v_team_id_for_third, updated_at = now()
                where match_no = v_match_no_text::int
                  and home_slot like '3%'
                  and status <> 'official'
                  and not coalesce(third_locked, false)  -- ← respeta override manual del admin
                  and home_team_id is distinct from v_team_id_for_third;

                update public.matches
                set away_team_id = v_team_id_for_third, updated_at = now()
                where match_no = v_match_no_text::int
                  and away_slot like '3%'
                  and status <> 'official'
                  and not coalesce(third_locked, false)  -- ← respeta override manual del admin
                  and away_team_id is distinct from v_team_id_for_third;
            end loop;
        end if;
    end if;

    -- 2) STANDARD: 1X, 2X, Ganador, Perdedor (no toca slots "3..." porque ya están)
    foreach v_round in array v_rounds loop
        for v_match in
            select id, match_no, stage, home_slot, away_slot, home_team_id, away_team_id, status
            from public.matches
            where stage = v_round
            order by match_no
        loop
            if v_match.status <> 'official' and v_match.home_slot is not null and v_match.home_slot not like '3%' then
                v_team_id := public.resolve_slot_to_team(v_match.match_no, 'home', v_match.home_slot);
                if v_team_id is distinct from v_match.home_team_id then
                    update public.matches set home_team_id = v_team_id, updated_at = now() where id = v_match.id;
                end if;
            end if;
            if v_match.status <> 'official' and v_match.away_slot is not null and v_match.away_slot not like '3%' then
                v_team_id := public.resolve_slot_to_team(v_match.match_no, 'away', v_match.away_slot);
                if v_team_id is distinct from v_match.away_team_id then
                    update public.matches set away_team_id = v_team_id, updated_at = now() where id = v_match.id;
                end if;
            end if;
        end loop;
    end loop;

    return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- d) RPC para volver a automático: limpia candados y re-resuelve.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reset_r32_third_lock()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then raise exception 'Solo admin.'; end if;
    update public.matches set third_locked = false, updated_at = now()
    where stage = 'R32' and status <> 'official' and third_locked = true;
    perform public.resolve_actual_knockout_teams();
    return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_reset_r32_third_lock() to authenticated;
