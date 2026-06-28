-- 28_scoring_v2_knockout.sql
-- Sube el puntaje de la fase de eliminatorias. Re-crea 3 funciones de scoring
-- IDÉNTICAS a 10_functions_scoring.sql salvo los valores:
--   - score_advancement:      R32 1→2 · R16 2→4 · QF 3→8 · SF 4→10
--   - score_champion_bonus:    10 → 20
--   - score_third_place_bonus:  5 → 10
--
-- NO cambia: grupos (+3/+1/+1), marcador exacto de eliminatorias (+3/+1),
-- la suma de recalculate_ticket_score, las columnas de ticket_scores ni la vista
-- de ranking. Como esta migración corre DESPUÉS de 10 y 15, gana por orden.
--
-- Aplicar ANTES de cargar resultados de eliminatorias (avance/campeón/tercero
-- valen 0 mientras el KO no se juegue → recalcular no mueve totales actuales).
-- Tras aplicar: select public.recalculate_all_scores();

-- ---------------------------------------------------------------------------
-- score_advancement: R32=2, R16=4, QF=8, SF=10 (antes 1,2,3,4)
-- ---------------------------------------------------------------------------
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
        select * from (values ('R32', 2), ('R16', 4), ('QF', 8), ('SF', 10)) as r(round, pts)
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

-- ---------------------------------------------------------------------------
-- score_champion_bonus: 20 (antes 10)
-- ---------------------------------------------------------------------------
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
    values (p_ticket_id, 'champion_bonus', 'FINAL', 20, jsonb_build_object('champion', v_actual_champion));

    return 20;
end;
$$;

-- ---------------------------------------------------------------------------
-- score_third_place_bonus: 10 (antes 5)
-- ---------------------------------------------------------------------------
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
    values (p_ticket_id, 'third_place_bonus', 'THIRD_PLACE', 10, jsonb_build_object('third', v_actual_third));

    return 10;
end;
$$;

grant execute on function public.score_advancement(uuid) to authenticated;
grant execute on function public.score_champion_bonus(uuid) to authenticated;
grant execute on function public.score_third_place_bonus(uuid) to authenticated;
