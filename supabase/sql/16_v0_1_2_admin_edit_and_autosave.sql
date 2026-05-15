-- 16_v0_1_2_admin_edit_and_autosave.sql
-- v0.1.2 additions:
--   1) Modo admin: super_admin / admin_tthh puede editar la predicción de cualquier
--      ticket reclamado. Ideal para que TTHH transcriba a la app lo que el
--      colaborador llenó a mano en el PDF.
--   2) Auto-save granular: nuevos RPCs para guardar asignaciones de mejores
--      terceros y borrar scores individuales, así el frontend puede persistir
--      cada cambio sin enviar el payload completo de submit_complete_prediction.
--
-- Idempotente. Re-ejecutar no rompe nada.

-- =============================================================================
-- Helper: ¿puede el usuario actual editar esta predicción?
-- =============================================================================
create or replace function public.can_edit_prediction(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.is_admin()
        or exists (
            select 1 from public.tickets t
            where t.id = p_ticket_id
              and t.claimed_by_user_id = auth.uid()
        );
$$;
grant execute on function public.can_edit_prediction(uuid) to authenticated;

-- =============================================================================
-- save_prediction_match_score: ahora acepta admin
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
    v_prediction public.prediction_headers%rowtype;
    v_match public.matches%rowtype;
    v_home_team uuid;
    v_away_team uuid;
    v_winner uuid;
    v_owner_user uuid;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.validate_deadline() then raise exception 'La fecha límite ya pasó.'; end if;
    if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
        raise exception 'Marcadores inválidos.';
    end if;

    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status <> 'claimed' then
        raise exception 'El ticket aún no fue reclamado.';
    end if;

    -- Para el prediction_headers, usamos el dueño del ticket como user_id (no el admin)
    v_owner_user := v_ticket.claimed_by_user_id;

    select * into v_match from public.matches where id = p_match_id;
    if not found then raise exception 'Partido no encontrado.'; end if;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_owner_user, 'in_progress')
    on conflict (ticket_id) do update set
        status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end,
        updated_at = now()
    returning * into v_prediction;

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
grant execute on function public.save_prediction_match_score(uuid, uuid, int, int, uuid, uuid, uuid) to authenticated;

-- =============================================================================
-- delete_prediction_match_score: borrar un score puntual (auto-save al limpiar)
-- =============================================================================
create or replace function public.delete_prediction_match_score(p_ticket_id uuid, p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prediction_id uuid;
begin
    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos.';
    end if;
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then
        return jsonb_build_object('ok', true, 'deleted', 0);
    end if;
    delete from public.prediction_match_scores where prediction_id = v_prediction_id and match_id = p_match_id;
    return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.delete_prediction_match_score(uuid, uuid) to authenticated;

-- =============================================================================
-- save_prediction_third_place_assignment: upsert una asignación de mejor tercero
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
    v_owner_user uuid;
    v_prediction_id uuid;
begin
    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select claimed_by_user_id into v_owner_user from public.tickets where id = p_ticket_id;
    if v_owner_user is null then raise exception 'El ticket no está reclamado.'; end if;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_owner_user, 'in_progress')
    on conflict (ticket_id) do update set updated_at = now()
    returning id into v_prediction_id;

    insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
    values (v_prediction_id, p_slot_match_id, p_team_id)
    on conflict (prediction_id, slot_match_id) do update set team_id = excluded.team_id;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.save_prediction_third_place_assignment(uuid, uuid, uuid) to authenticated;

-- =============================================================================
-- clear_prediction_third_place_assignment: borra una asignación puntual
-- =============================================================================
create or replace function public.clear_prediction_third_place_assignment(
    p_ticket_id uuid,
    p_slot_match_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prediction_id uuid;
begin
    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos.';
    end if;
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return jsonb_build_object('ok', true); end if;
    delete from public.prediction_third_place_assignments
    where prediction_id = v_prediction_id and slot_match_id = p_slot_match_id;
    return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.clear_prediction_third_place_assignment(uuid, uuid) to authenticated;

-- =============================================================================
-- submit_complete_prediction: ahora acepta admin (via can_edit_prediction)
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
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.validate_deadline() then raise exception 'La fecha límite ya pasó.'; end if;
    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status <> 'claimed' then
        raise exception 'El ticket aún no fue reclamado.';
    end if;

    v_owner_user := v_ticket.claimed_by_user_id;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_owner_user, 'in_progress')
    on conflict (ticket_id) do update set
        status = case when public.prediction_headers.status = 'pending' then 'in_progress' else public.prediction_headers.status end,
        updated_at = now()
    returning id into v_prediction_id;

    delete from public.prediction_match_scores where prediction_id = v_prediction_id;
    delete from public.prediction_third_place_assignments where prediction_id = v_prediction_id;

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

    perform public.build_predicted_group_standings(p_ticket_id);

    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'third_place_assignments', '[]'::jsonb)) loop
        insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
        values (v_prediction_id, (v_row->>'slot_match_id')::uuid, (v_row->>'team_id')::uuid);
    end loop;

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
            raise exception 'Eliminatoria: equipos home/away obligatorios.';
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

    update public.prediction_headers
    set champion_team_id    = nullif(p_payload->>'champion_team_id', '')::uuid,
        third_place_team_id = nullif(p_payload->>'third_place_team_id', '')::uuid,
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    where id = v_prediction_id;

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
grant execute on function public.submit_complete_prediction(uuid, jsonb) to authenticated;

-- =============================================================================
-- Fin de 16_v0_1_2_admin_edit_and_autosave.sql
-- =============================================================================
