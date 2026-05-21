-- 23_admin_bypass_deadline.sql
-- Nueva semántica del deadline (10 jun 2026 23:59 ECT):
--
--   - sell_ticket / claim_ticket  → BLOQUEADAS para TODOS post-deadline
--     (incluido admin). El cierre es operativo.
--
--   - submit_complete_prediction
--   - save_prediction_match_score
--   - save_prediction_third_place_assignment
--     → BLOQUEADAS para colaboradores (auth normal) post-deadline,
--       pero ADMIN puede seguir cargando/editando/guardando para
--       transcribir tickets del papel que llegaron tarde.
--
-- can_edit_prediction ya restringe al admin a tickets `sold` y no
-- reclamados (file 19), así que el admin nunca pisa la predicción de
-- un colaborador que reclamó por su cuenta.
--
-- Idempotente: re-ejecutar no rompe nada (drop + create or replace).

-- =============================================================================
-- 1) submit_complete_prediction: admin bypass del deadline
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
    v_stage text;
    v_champion uuid := nullif(p_payload->>'champion_team_id','')::uuid;
    v_third uuid := nullif(p_payload->>'third_place_team_id','')::uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;

    -- Deadline solo bloquea a colaboradores normales. Admin sigue cargando
    -- predicciones de tickets sold (limitado luego por can_edit_prediction).
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

    -- Group scores
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'group_scores', '[]'::jsonb))
    loop
        select * into v_match from public.matches where id = (v_row->>'match_id')::uuid;
        if not found then continue; end if;
        v_home_score := nullif(v_row->>'home_score','')::int;
        v_away_score := nullif(v_row->>'away_score','')::int;
        v_home_team := coalesce(nullif(v_row->>'home_team_id','')::uuid, v_match.home_team_id);
        v_away_team := coalesce(nullif(v_row->>'away_team_id','')::uuid, v_match.away_team_id);
        insert into public.prediction_match_scores (
            prediction_id, match_id, stage, home_team_id, away_team_id,
            home_score, away_score
        ) values (
            v_prediction_id, v_match.id, v_match.stage, v_home_team, v_away_team,
            v_home_score, v_away_score
        );
    end loop;

    -- Third place assignments
    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'third_place_assignments', '[]'::jsonb))
    loop
        insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
        values (v_prediction_id, (v_row->>'slot_match_id')::uuid, (v_row->>'team_id')::uuid);
    end loop;

    -- Knockout matches
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
        insert into public.prediction_match_scores (
            prediction_id, match_id, stage, home_team_id, away_team_id,
            home_score, away_score, penalty_winner_team_id
        ) values (
            v_prediction_id, v_match.id, v_stage, v_home_team, v_away_team,
            v_home_score, v_away_score, v_penalty_winner
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
-- 2) save_prediction_match_score: admin bypass del deadline
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

    insert into public.prediction_match_scores (
        prediction_id, match_id, stage, home_team_id, away_team_id,
        home_score, away_score, penalty_winner_team_id
    ) values (
        v_prediction_id, p_match_id, v_stage, v_home_team, v_away_team,
        p_home_score, p_away_score, p_penalty_winner_team_id
    )
    on conflict (prediction_id, match_id) do update set
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        penalty_winner_team_id = excluded.penalty_winner_team_id,
        home_team_id = excluded.home_team_id,
        away_team_id = excluded.away_team_id,
        updated_at = now();

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.save_prediction_match_score(uuid, uuid, int, int, uuid, uuid, uuid) to authenticated;

-- =============================================================================
-- 3) save_prediction_third_place_assignment: añadir check deadline + bypass
-- =============================================================================
create or replace function public.save_prediction_third_place_assignment(
    p_ticket_id uuid,
    p_slot_match_id uuid,
    p_team_id uuid
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

    insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
    values (v_prediction_id, p_slot_match_id, p_team_id)
    on conflict (prediction_id, slot_match_id) do update set team_id = excluded.team_id;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.save_prediction_third_place_assignment(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
