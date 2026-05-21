-- 25_winner_team_id_persist.sql
-- BUG FIX: `prediction_match_scores.winner_team_id` nunca se persistía en
-- knockouts. Resultado: al hidratar el bracket desde BD, advancingTeamId
-- = null → summarizeFinalPrediction no podía derivar el campeón →
-- pantalla "Resumen" mostraba "Pendiente" en todas las posiciones aunque
-- el ticket estuviera submitted. Progreso bar 71% (KO sin contar como
-- completados).
--
-- FIX:
--   1. submit_complete_prediction: calcula winner_team_id en cada INSERT
--      de knockout match.
--   2. save_prediction_match_score: misma lógica (autosave).
--   3. Backfill UPDATE para las predicciones existentes que tienen
--      home/away_score pero winner_team_id NULL.
--
-- Lógica del winner para knockout:
--   home_score > away_score → home_team_id
--   away_score > home_score → away_team_id
--   home_score = away_score → penalty_winner_team_id (empate → penales)
--
-- Para grupos (stage='GROUP') el winner_team_id no aplica al puntaje,
-- pero por consistencia también lo calculamos en save_prediction_match_score
-- (puede quedar null en empate de grupos, lo cual es válido).
--
-- Idempotente: re-ejecutar no rompe nada.

-- =============================================================================
-- 1) submit_complete_prediction: guardar winner_team_id en KO
-- =============================================================================
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
    v_owner_user uuid;
    v_prediction_id uuid;
    v_row jsonb;
    v_match public.matches%rowtype;
    v_home_team uuid;
    v_away_team uuid;
    v_home_score int;
    v_away_score int;
    v_penalty_winner uuid;
    v_winner uuid;
    v_stage text;
    v_champion uuid := nullif(p_payload->>'champion_team_id','')::uuid;
    v_third uuid := nullif(p_payload->>'third_place_team_id','')::uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;

    if public.is_deadline_passed() and not public.is_admin() then
        raise exception 'El deadline ya pasó. Las predicciones están cerradas.';
    end if;

    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;

    v_owner_user := coalesce(v_ticket.claimed_by_user_id, v_user);

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_owner_user, 'in_progress')
    on conflict (ticket_id) do update set
        status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end,
        updated_at = now()
    returning id into v_prediction_id;

    delete from public.prediction_match_scores where prediction_id = v_prediction_id;
    delete from public.prediction_third_place_assignments where prediction_id = v_prediction_id;

    -- Group scores (no necesitan winner para puntaje, pero lo calculamos
    -- igual: en empate queda null, que es semánticamente correcto)
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'group_scores', '[]'::jsonb))
    loop
        select * into v_match from public.matches where id = (v_row->>'match_id')::uuid;
        if not found then continue; end if;
        v_home_score := nullif(v_row->>'home_score','')::int;
        v_away_score := nullif(v_row->>'away_score','')::int;
        v_home_team := coalesce(nullif(v_row->>'home_team_id','')::uuid, v_match.home_team_id);
        v_away_team := coalesce(nullif(v_row->>'away_team_id','')::uuid, v_match.away_team_id);

        v_winner := case
            when v_home_score is null or v_away_score is null then null
            when v_home_score > v_away_score then v_home_team
            when v_away_score > v_home_score then v_away_team
            else null  -- empate en grupos → sin winner
        end;

        insert into public.prediction_match_scores (
            prediction_id, match_id, stage, home_team_id, away_team_id,
            home_score, away_score, winner_team_id
        ) values (
            v_prediction_id, v_match.id, v_match.stage, v_home_team, v_away_team,
            v_home_score, v_away_score, v_winner
        );
    end loop;

    -- Third place assignments
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'third_place_assignments', '[]'::jsonb))
    loop
        insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
        values (v_prediction_id, (v_row->>'slot_match_id')::uuid, (v_row->>'team_id')::uuid);
    end loop;

    -- Knockout matches — AHORA calcula y guarda winner_team_id
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'knockout_matches', '[]'::jsonb))
    loop
        select * into v_match from public.matches where id = (v_row->>'match_id')::uuid;
        if not found then continue; end if;
        v_stage := v_match.stage;
        v_home_team := nullif(v_row->>'home_team_id','')::uuid;
        v_away_team := nullif(v_row->>'away_team_id','')::uuid;
        v_home_score := nullif(v_row->>'home_score','')::int;
        v_away_score := nullif(v_row->>'away_score','')::int;
        v_penalty_winner := nullif(v_row->>'penalty_winner_team_id','')::uuid;
        if v_home_team is null or v_away_team is null then continue; end if;

        -- KO: si hay marcador, calculamos ganador. En empate usa penalty_winner.
        v_winner := case
            when v_home_score is null or v_away_score is null then null
            when v_home_score > v_away_score then v_home_team
            when v_away_score > v_home_score then v_away_team
            else v_penalty_winner  -- empate KO → penales obligatorios
        end;

        insert into public.prediction_match_scores (
            prediction_id, match_id, stage, home_team_id, away_team_id,
            home_score, away_score, penalty_winner_team_id, winner_team_id
        ) values (
            v_prediction_id, v_match.id, v_stage, v_home_team, v_away_team,
            v_home_score, v_away_score, v_penalty_winner, v_winner
        );
    end loop;

    update public.prediction_headers
    set champion_team_id = v_champion,
        third_place_team_id = v_third,
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    where id = v_prediction_id;

    perform public.build_predicted_group_standings(p_ticket_id);
    perform public.build_predicted_bracket(p_ticket_id);

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.submit_complete_prediction(uuid, jsonb) to authenticated;

-- =============================================================================
-- 2) save_prediction_match_score: calcular winner_team_id en autosave
-- =============================================================================
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
    v_owner_user uuid;
    v_prediction_id uuid;
    v_match public.matches%rowtype;
    v_stage text;
    v_home_team uuid;
    v_away_team uuid;
    v_winner uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;

    if public.is_deadline_passed() and not public.is_admin() then
        raise exception 'El deadline ya pasó. Las predicciones están cerradas.';
    end if;

    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;

    v_owner_user := coalesce(v_ticket.claimed_by_user_id, v_user);

    select * into v_match from public.matches where id = p_match_id;
    if not found then raise exception 'Partido no encontrado.'; end if;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_owner_user, 'in_progress')
    on conflict (ticket_id) do update set
        status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end,
        updated_at = now()
    returning id into v_prediction_id;

    v_stage := v_match.stage;
    v_home_team := coalesce(p_home_team_id, v_match.home_team_id);
    v_away_team := coalesce(p_away_team_id, v_match.away_team_id);

    -- Calcular winner desde scores (grupo o KO).
    -- En empate de KO usa penalty_winner; en empate de grupo queda null.
    v_winner := case
        when p_home_score is null or p_away_score is null then null
        when p_home_score > p_away_score then v_home_team
        when p_away_score > p_home_score then v_away_team
        when v_stage = 'GROUP' then null
        else p_penalty_winner_team_id
    end;

    insert into public.prediction_match_scores (
        prediction_id, match_id, stage, home_team_id, away_team_id,
        home_score, away_score, penalty_winner_team_id, winner_team_id
    ) values (
        v_prediction_id, p_match_id, v_stage, v_home_team, v_away_team,
        p_home_score, p_away_score, p_penalty_winner_team_id, v_winner
    )
    on conflict (prediction_id, match_id) do update set
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        penalty_winner_team_id = excluded.penalty_winner_team_id,
        winner_team_id = excluded.winner_team_id,
        home_team_id = excluded.home_team_id,
        away_team_id = excluded.away_team_id,
        updated_at = now();

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.save_prediction_match_score(uuid, uuid, int, int, uuid, uuid, uuid) to authenticated;

-- =============================================================================
-- 3) BACKFILL: arreglar predicciones ya enviadas sin necesidad de reenvío
-- =============================================================================
update public.prediction_match_scores
set winner_team_id = case
    when home_score is null or away_score is null then null
    when home_score > away_score then home_team_id
    when away_score > home_score then away_team_id
    when stage = 'GROUP' then null
    else penalty_winner_team_id
  end
where winner_team_id is null
  and home_score is not null
  and away_score is not null
  and (
    stage <> 'GROUP' or home_score <> away_score
  );

-- Diagnóstico final
do $$
declare
    v_ko_total int;
    v_ko_with_winner int;
    v_predictions_submitted int;
begin
    select count(*) into v_ko_total
    from public.prediction_match_scores
    where stage <> 'GROUP' and home_score is not null and away_score is not null;

    select count(*) into v_ko_with_winner
    from public.prediction_match_scores
    where stage <> 'GROUP' and home_score is not null and away_score is not null
      and winner_team_id is not null;

    select count(*) into v_predictions_submitted
    from public.prediction_headers where status = 'submitted';

    raise notice 'BACKFILL → KO matches con score: % | con winner persistido: % | predictions submitted: %',
        v_ko_total, v_ko_with_winner, v_predictions_submitted;

    if v_ko_total = v_ko_with_winner then
        raise notice '✓ Todos los knockout matches con score tienen winner_team_id. Bug arreglado.';
    else
        raise warning '⚠ % knockout matches sin winner. Probablemente empates sin penalty_winner_team_id seteado.',
            (v_ko_total - v_ko_with_winner);
    end if;
end$$;

notify pgrst, 'reload schema';
