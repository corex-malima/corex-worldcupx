-- 20_deadline_enforcement.sql
-- Hard deadline para todo el flujo previo al torneo:
--   - sell_ticket: bloqueado después del deadline
--   - claim_ticket: bloqueado después del deadline
--   - submit_complete_prediction: bloqueado después del deadline
--   - save_prediction_match_score: bloqueado después del deadline
--   - Admin sigue pudiendo cargar resultados oficiales y recalcular ranking.
--
-- Deadline oficial: 10 de junio 2026, 23:59:59 hora Ecuador (UTC-5).
-- Vive en public.app_config (key='prediction_deadline') para que sea
-- editable sin redeploy.
--
-- Idempotente.

-- =============================================================================
-- 1) Update deadline en app_config
-- =============================================================================
insert into public.app_config (key, value, description)
values
    ('prediction_deadline',
     '{"deadline_at":"2026-06-10T23:59:59-05:00"}'::jsonb,
     'Deadline duro: venta, claim y predicciones bloqueados después.')
on conflict (key) do update set
    value = excluded.value,
    description = excluded.description,
    updated_at = now();

-- =============================================================================
-- 2) Helper: lee deadline del app_config y devuelve true si ya pasó
-- =============================================================================
create or replace function public.is_deadline_passed()
returns boolean
language sql
stable
set search_path = public
as $$
    select coalesce(
        ((value->>'deadline_at')::timestamptz < now())
        ,false
    )
    from public.app_config
    where key = 'prediction_deadline'
    limit 1;
$$;
grant execute on function public.is_deadline_passed() to authenticated, anon;

-- =============================================================================
-- 3) sell_ticket(p_cedula text) — bloquear post-deadline
-- =============================================================================
create or replace function public.sell_ticket(p_cedula text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin uuid := auth.uid();
    v_employee public.employees%rowtype;
    v_code text;
    v_ticket_id uuid;
begin
    if v_admin is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.is_admin() then raise exception 'Solo TTHH puede vender tickets.'; end if;
    if public.is_deadline_passed() then raise exception 'El deadline ya pasó. La venta de tickets está cerrada.'; end if;

    select * into v_employee from public.employees
    where regexp_replace(cedula,'\D','','g') = regexp_replace(coalesce(p_cedula,''),'\D','','g')
      and is_active = true
    limit 1;
    if not found then raise exception 'Empleado no encontrado o inactivo.'; end if;

    v_code := public.generate_ticket_code();

    insert into public.tickets (code, employee_id, cedula, person_id, person_name,
                                area_id, area_name, job_title, job_classification_code,
                                sold_by_user_id, status)
    values (v_code, v_employee.id, v_employee.cedula, v_employee.person_id, v_employee.person_name,
            v_employee.area_id, v_employee.area_name, v_employee.job_title, v_employee.job_classification_code,
            v_admin, 'sold')
    returning id into v_ticket_id;

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'sell_ticket', 'tickets', v_ticket_id, jsonb_build_object('code', v_code));

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket_id, 'code', v_code);
end;
$$;
grant execute on function public.sell_ticket(text) to authenticated;

-- =============================================================================
-- 4) sell_ticket(p_person_id, ... full) — bloquear post-deadline
-- =============================================================================
create or replace function public.sell_ticket(
    p_person_id text,
    p_national_id text,
    p_person_name text,
    p_area_id text,
    p_area_name text,
    p_job_title text,
    p_job_classification_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin uuid := auth.uid();
    v_employee_id uuid;
    v_code text;
    v_ticket_id uuid;
begin
    if v_admin is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.is_admin() then raise exception 'Solo TTHH puede vender tickets.'; end if;
    if public.is_deadline_passed() then raise exception 'El deadline ya pasó. La venta de tickets está cerrada.'; end if;

    insert into public.employees (cedula, person_id, person_name, area_id, area_name,
                                  job_title, job_classification_code, is_active)
    values (p_national_id, p_person_id, p_person_name, p_area_id, p_area_name,
            p_job_title, p_job_classification_code, true)
    on conflict (cedula) do update set
        person_id = excluded.person_id,
        person_name = excluded.person_name,
        area_id = excluded.area_id,
        area_name = excluded.area_name,
        job_title = excluded.job_title,
        job_classification_code = excluded.job_classification_code,
        is_active = true,
        updated_at = now()
    returning id into v_employee_id;

    if v_employee_id is null then
        select id into v_employee_id from public.employees where cedula = p_national_id limit 1;
    end if;

    v_code := public.generate_ticket_code();

    insert into public.tickets (code, employee_id, cedula, person_id, person_name,
                                area_id, area_name, job_title, job_classification_code,
                                sold_by_user_id, status)
    values (v_code, v_employee_id, p_national_id, p_person_id, p_person_name,
            p_area_id, p_area_name, p_job_title, p_job_classification_code,
            v_admin, 'sold')
    returning id into v_ticket_id;

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'sell_ticket', 'tickets', v_ticket_id, jsonb_build_object('code', v_code, 'national_id', p_national_id));

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket_id, 'code', v_code);
end;
$$;
grant execute on function public.sell_ticket(text, text, text, text, text, text, text) to authenticated;

-- =============================================================================
-- 5) claim_ticket: bloquear post-deadline
--    También transfiere ownership del prediction_header (heredado de file 19)
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
    if public.is_deadline_passed() then raise exception 'El deadline ya pasó. No se pueden reclamar tickets.'; end if;

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

    -- Transferir prediction_header al nuevo dueño (si admin ya había cargado predicción)
    update public.prediction_headers
    set user_id = v_user, updated_at = now()
    where ticket_id = v_ticket.id;

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket.id);
end;
$$;
grant execute on function public.claim_ticket(text) to authenticated;

-- =============================================================================
-- 6) submit_complete_prediction: ya bloquea por can_edit_prediction pero
--    agregamos chequeo explícito de deadline para mensaje más claro.
--    Solo el admin tiene un "gracia" (puede cargar tarde) cuando es modo TTHH
--    sobre un sold — pero también respetamos deadline para evitar abusos.
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
    if public.is_deadline_passed() then raise exception 'El deadline ya pasó. Las predicciones están cerradas.'; end if;
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

    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'group_scores', '[]'::jsonb))
    loop
        select * into v_match from public.matches where id = (v_row->>'match_id')::uuid;
        if not found then continue; end if;
        v_home_score := nullif(v_row->>'home_score','')::int;
        v_away_score := nullif(v_row->>'away_score','')::int;
        v_home_team := coalesce(nullif(v_row->>'home_team_id','')::uuid, v_match.home_team_id);
        v_away_team := coalesce(nullif(v_row->>'away_team_id','')::uuid, v_match.away_team_id);
        insert into public.prediction_match_scores (
            prediction_id, match_id, stage, home_team_id, away_team_id, home_score, away_score
        ) values (
            v_prediction_id, v_match.id, v_match.stage, v_home_team, v_away_team, v_home_score, v_away_score
        );
    end loop;

    for v_row in select * from jsonb_array_elements(coalesce(p_payload->'third_place_assignments', '[]'::jsonb))
    loop
        insert into public.prediction_third_place_assignments (prediction_id, slot_match_id, team_id)
        values (v_prediction_id, (v_row->>'slot_match_id')::uuid, (v_row->>'team_id')::uuid);
    end loop;

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
-- 7) save_prediction_match_score: idem, agrega chequeo de deadline
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
    if public.is_deadline_passed() then raise exception 'El deadline ya pasó. Las predicciones están cerradas.'; end if;
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
