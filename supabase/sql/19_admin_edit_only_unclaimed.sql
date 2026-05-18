-- 19_admin_edit_only_unclaimed.sql
-- Cambia la semántica de "modo admin" para predicciones: el admin solo puede
-- editar tickets NO reclamados (status='sold' y claimed_by_user_id is null).
-- Una vez el colaborador hace su claim y entra a la app, la predicción es suya
-- y nadie más la edita.
--
-- Motivación: TTHH debe poder transcribir el papel de un colaborador que
-- prefirió no usar la app. Ese caso es exactamente el de un ticket "sold".
-- Antes del fix: admin podía editar tickets claimed (mal), pero NO podía
-- editar tickets sold (mal).
--
-- Idempotente: re-ejecutar no rompe nada.

-- =============================================================================
-- 0) DROP de funciones que cambian de nombre/defaults de parámetros
--    (PostgreSQL no permite eso con CREATE OR REPLACE FUNCTION).
-- =============================================================================
drop function if exists public.claim_ticket(text) cascade;
drop function if exists public.save_prediction_match_score(uuid, uuid, int, int, uuid, uuid, uuid) cascade;
drop function if exists public.save_prediction_match_score(uuid, uuid, int, int, uuid) cascade;
drop function if exists public.submit_complete_prediction(uuid, jsonb) cascade;
drop function if exists public.can_edit_prediction(uuid) cascade;

-- =============================================================================
-- 1) can_edit_prediction: nueva semántica
-- =============================================================================
create or replace function public.can_edit_prediction(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.tickets t
        where t.id = p_ticket_id
          and (
              t.claimed_by_user_id = auth.uid()
              or (
                  public.is_admin()
                  and t.status = 'sold'
                  and t.claimed_by_user_id is null
              )
          )
    );
$$;
grant execute on function public.can_edit_prediction(uuid) to authenticated;

-- =============================================================================
-- 2) save_prediction_match_score: usar v_user (admin) si nadie reclamó
--    Quita el check "ticket must be claimed".
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
    if not public.can_edit_prediction(p_ticket_id) then
        raise exception 'Sin permisos para editar esta predicción.';
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;

    -- Owner del prediction_headers:
    --   - si el ticket ya fue reclamado por alguien, ese alguien es el dueño
    --   - si no, el admin que está cargando la predicción figura como owner
    --     (cuando el colaborador reclame, claim_ticket actualizará user_id)
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
-- 3) submit_complete_prediction: misma idea (coalesce + sin check de claimed)
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

    -- Champion + third place predicted
    update public.prediction_headers
    set champion_team_id = v_champion,
        third_place_team_id = v_third,
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    where id = v_prediction_id;

    -- Build standings + bracket helpers
    perform public.build_predicted_group_standings(p_ticket_id);
    perform public.build_predicted_bracket(p_ticket_id);

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.submit_complete_prediction(uuid, jsonb) to authenticated;

-- =============================================================================
-- 4) claim_ticket: cuando el colaborador reclama, transferir prediction header
--    user_id al colaborador (si admin ya había cargado predicción)
-- =============================================================================
create or replace function public.claim_ticket(p_ticket_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_ticket public.tickets%rowtype;
    v_profile_cedula text;
    v_clean_code text;
begin
    if v_user is null then raise exception 'Usuario no autenticado.'; end if;
    v_clean_code := trim(coalesce(p_ticket_code, ''));
    if v_clean_code = '' then raise exception 'Código vacío.'; end if;

    select cedula into v_profile_cedula from public.profiles where user_id = v_user;
    if v_profile_cedula is null then raise exception 'Perfil no encontrado.'; end if;

    select * into v_ticket from public.tickets
    where upper(code) = upper(v_clean_code) for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status = 'cancelled' then raise exception 'Ticket anulado.'; end if;
    if v_ticket.status = 'claimed' or v_ticket.claimed_by_user_id is not null then
        raise exception 'El ticket ya fue reclamado.';
    end if;
    if regexp_replace(v_ticket.cedula, '\D', '', 'g') <> regexp_replace(v_profile_cedula, '\D', '', 'g') then
        raise exception 'Este ticket no está asociado a tu cédula.';
    end if;

    update public.tickets
    set status = 'claimed',
        claimed_by_user_id = v_user,
        claimed_at = now(),
        updated_at = now()
    where id = v_ticket.id;

    -- Si admin ya había cargado predicción mientras el ticket estaba sold,
    -- transferir la propiedad del header al colaborador que ahora lo reclama.
    update public.prediction_headers
    set user_id = v_user, updated_at = now()
    where ticket_id = v_ticket.id;

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket.id);
end;
$$;
grant execute on function public.claim_ticket(text) to authenticated;
