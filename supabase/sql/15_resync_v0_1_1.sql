-- 15_resync_v0_1_1.sql
-- Catch-up idempotente para bases de datos que ejecutaron 00→14 ANTES de los
-- commits 69f5ddc..ba7c369. Re-ejecutar este archivo NO rompe nada porque
-- todo es CREATE OR REPLACE / IF NOT EXISTS / DROP IF EXISTS.
--
-- También incluye dos features nuevas de v0.1.1:
--   * Alias amigable de tickets ("Ticket 1", "Ticket 2"… por colaborador).
--   * View v_employee_ticket_stats para los contadores reales del SellTicketPanel.

create extension if not exists pgcrypto;

-- =============================================================================
-- 1) SCHEMA: prediction_third_place_assignments + third_place_team_id
-- =============================================================================

alter table public.prediction_headers
  add column if not exists third_place_team_id uuid references public.teams(id);

create table if not exists public.prediction_third_place_assignments (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.prediction_headers(id) on delete cascade,
    slot_match_id uuid not null references public.matches(id) on delete cascade,
    team_id uuid not null references public.teams(id),
    created_at timestamptz not null default now()
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'prediction_third_place_assignments_unique') then
        alter table public.prediction_third_place_assignments
          add constraint prediction_third_place_assignments_unique unique (prediction_id, slot_match_id);
    end if;
end $$;

create index if not exists idx_prediction_third_place_assignments_prediction
  on public.prediction_third_place_assignments (prediction_id);

-- =============================================================================
-- 2) RLS
-- =============================================================================

alter table public.prediction_third_place_assignments enable row level security;

drop policy if exists third_place_owner_all on public.prediction_third_place_assignments;
create policy third_place_owner_all on public.prediction_third_place_assignments for all using (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
) with check (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
);

drop policy if exists third_place_admin_select on public.prediction_third_place_assignments;
create policy third_place_admin_select on public.prediction_third_place_assignments for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

-- Reemplazo de políticas admin con is_admin() (rompe recursión RLS sobre profiles).
do $$
begin
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles') then
        drop policy if exists profiles_admin_select on public.profiles;
        create policy profiles_admin_select on public.profiles for select using (public.is_admin());
    end if;
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'employees') then
        drop policy if exists employees_admin_select on public.employees;
        create policy employees_admin_select on public.employees for select using (public.is_admin());
    end if;
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'tickets') then
        drop policy if exists tickets_admin_select on public.tickets;
        create policy tickets_admin_select on public.tickets for select using (public.is_admin());
    end if;
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'prediction_headers') then
        drop policy if exists prediction_admin_select on public.prediction_headers;
        create policy prediction_admin_select on public.prediction_headers for select using (public.is_admin());
    end if;
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'prediction_match_scores') then
        drop policy if exists prediction_scores_admin_select on public.prediction_match_scores;
        create policy prediction_scores_admin_select on public.prediction_match_scores for select using (public.is_admin());
    end if;
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'admin_audit_log') then
        drop policy if exists audit_admin_select on public.admin_audit_log;
        create policy audit_admin_select on public.admin_audit_log for select using (public.is_admin());
    end if;
end $$;

-- =============================================================================
-- 3) AUTH: resolve_auth_email_by_cedula versión robusta (lee email real)
-- =============================================================================

create or replace function public.resolve_auth_email_by_cedula(p_cedula text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_cedula text := regexp_replace(coalesce(p_cedula, ''), '\D', '', 'g');
    v_user_id uuid;
    v_email text;
begin
    select user_id into v_user_id from public.profiles where cedula = v_cedula limit 1;
    if v_user_id is null then
        return jsonb_build_object('ok', false, 'message', 'Credenciales inválidas.');
    end if;
    select email into v_email from auth.users where id = v_user_id limit 1;
    if v_email is null then
        return jsonb_build_object('ok', false, 'message', 'Credenciales inválidas.');
    end if;
    return jsonb_build_object('ok', true, 'technical_email', v_email);
end;
$$;
grant execute on function public.resolve_auth_email_by_cedula(text) to anon, authenticated;

-- =============================================================================
-- 4) TICKETS: eliminar la sobrecarga claim_ticket(2 args) que rompía el contrato
-- =============================================================================

drop function if exists public.claim_ticket(p_national_id text, p_ticket_code text);
drop function if exists public.claim_ticket(text, text);
-- Queda el claim_ticket(p_code text) original de 07_functions_tickets.sql.

-- =============================================================================
-- 5) PREDICCIÓN: save_prediction_match_score + submit_complete_prediction
--    + build_predicted_bracket actualizados
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

    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, team_id, source)
    select v_prediction_id, 'R32', position::text || group_code, team_id, 'predicted_group_standings'
    from public.predicted_group_standings
    where prediction_id = v_prediction_id and position <= 2;

    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, match_id, team_id, source)
    select v_prediction_id, 'R32', '3_' || m.match_no::text, m.id, a.team_id, 'prediction_third_place_assignments'
    from public.prediction_third_place_assignments a
    join public.matches m on m.id = a.slot_match_id
    where a.prediction_id = v_prediction_id;

    insert into public.predicted_bracket_slots (prediction_id, stage, slot_code, match_id, team_id, source)
    select v_prediction_id, m.stage, 'W' || m.match_no::text, m.id, s.winner_team_id, 'prediction_match_scores'
    from public.matches m
    join public.prediction_match_scores s on s.match_id = m.id and s.prediction_id = v_prediction_id
    where m.stage in ('R32', 'R16', 'QF', 'SF', 'FINAL') and s.winner_team_id is not null;

    return jsonb_build_object('ok', true, 'prediction_id', v_prediction_id);
end;
$$;
grant execute on function public.build_predicted_bracket(uuid) to authenticated;

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

    select * into v_ticket from public.tickets where id = p_ticket_id for update;
    if not found then raise exception 'Ticket no encontrado.'; end if;
    if v_ticket.status <> 'claimed' or v_ticket.claimed_by_user_id <> v_user then
        raise exception 'El ticket no está reclamado por este usuario.';
    end if;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (p_ticket_id, v_user, 'in_progress')
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
            raise exception 'Eliminatoria: los equipos home/away son obligatorios.';
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
-- 6) RESULTADOS OFICIALES: resolve_slot_to_team + resolve_actual_knockout_teams
--    + build_actual_bracket completos
-- =============================================================================

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

    if v_slot ~ '^[12][A-L]$' then
        v_position := substring(v_slot from 1 for 1)::int;
        v_group := substring(v_slot from 2 for 1);
        select team_id into v_team_id
        from public.actual_group_standings
        where group_code = v_group and position = v_position;
        return v_team_id;
    end if;

    if v_slot like '3%' then
        select allowed_groups into v_allowed from public.r32_third_place_rules where match_no = p_match_no;
        if v_allowed is null then return null; end if;

        with thirds as (
            select s.group_code, s.team_id, s.points, s.goal_difference, s.goals_for
            from public.actual_group_standings s
            where s.position = 3
            order by s.points desc, s.goal_difference desc, s.goals_for desc, s.group_code asc
            limit 8
        )
        select array_agg(group_code order by group_code) into v_best_thirds from thirds;

        if v_best_thirds is null then return null; end if;

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

    if v_slot ~* '^Ganador Partido [0-9]+$' then
        v_src_no := (regexp_match(v_slot, '([0-9]+)'))[1]::int;
        select winner_team_id into v_src_winner from public.matches where match_no = v_src_no;
        return v_src_winner;
    end if;

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
grant execute on function public.resolve_slot_to_team(int, text, text) to authenticated;

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
            if v_match.home_team_id is null and v_match.home_slot is not null and v_match.status <> 'official' then
                v_team_id := public.resolve_slot_to_team(v_match.match_no, 'home', v_match.home_slot);
                if v_team_id is not null then
                    update public.matches set home_team_id = v_team_id, updated_at = now() where id = v_match.id;
                end if;
            end if;
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
grant execute on function public.resolve_actual_knockout_teams() to authenticated;

create or replace function public.build_actual_bracket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then raise exception 'Solo admin puede construir bracket oficial.'; end if;

    delete from public.actual_bracket_slots where true;

    insert into public.actual_bracket_slots (stage, slot_code, team_id, source)
    select 'R32', position::text || group_code, team_id, 'actual_group_standings'
    from public.actual_group_standings
    where position <= 2;

    insert into public.actual_bracket_slots (stage, slot_code, team_id, source)
    select 'R32', '3' || group_code, team_id, 'actual_group_standings_best_thirds'
    from (
        select group_code, team_id
        from public.actual_group_standings
        where position = 3
        order by points desc, goal_difference desc, goals_for desc, group_code asc
        limit 8
    ) best;

    insert into public.actual_bracket_slots (stage, slot_code, match_id, team_id, source)
    select m.stage, 'W' || m.match_no::text, m.id, m.winner_team_id, 'matches'
    from public.matches m
    where m.stage in ('R32', 'R16', 'QF', 'SF', 'FINAL') and m.winner_team_id is not null;

    return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.build_actual_bracket() to authenticated;

-- Update save_actual_result para que dispare resolve_actual_knockout_teams
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
grant execute on function public.save_actual_result(uuid, int, int, uuid) to authenticated;

-- =============================================================================
-- 7) SCORING completo
-- =============================================================================

create or replace function public.score_match(
    p_actual_home int,
    p_actual_away int,
    p_pred_home int,
    p_pred_away int
)
returns int
language sql
immutable
as $$
    select case
        when p_actual_home is null or p_actual_away is null or p_pred_home is null or p_pred_away is null then 0
        when p_actual_home = p_pred_home and p_actual_away = p_pred_away then 3
        when sign(p_actual_home - p_actual_away) = sign(p_pred_home - p_pred_away) then 1
        else 0
    end;
$$;

create or replace function public.score_group_positions(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    v_points int := 0;
    v_prediction_id uuid;
begin
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return 0; end if;

    -- Gate por grupo completo (6 partidos oficiales) para evitar puntos por defecto seed_order.
    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'group_position', p.group_code || ':' || t.fifa_code, 1,
           jsonb_build_object('group_code', p.group_code, 'team', t.name, 'position', p.position)
    from public.predicted_group_standings p
    join public.actual_group_standings a on a.group_code = p.group_code and a.team_id = p.team_id and a.position = p.position
    join public.teams t on t.id = p.team_id
    join (
        select group_code, count(*) filter (where status = 'official') as official_count
        from public.matches where stage = 'GROUP'
        group by group_code
    ) gc on gc.group_code = p.group_code and gc.official_count >= 6
    where p.prediction_id = v_prediction_id and p.position in (1, 2, 3);

    get diagnostics v_points = row_count;
    return coalesce(v_points, 0);
end;
$$;

create or replace function public.score_bracket_crosses(p_ticket_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    v_points int := 0;
    v_prediction_id uuid;
begin
    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then return 0; end if;

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'cross', m.stage || ':' || m.match_no::text, 1,
           jsonb_build_object(
             'match_no', m.match_no,
             'stage', m.stage,
             'actual', jsonb_build_array(m.home_team_id, m.away_team_id),
             'prediction', jsonb_build_array(s.home_team_id, s.away_team_id)
           )
    from public.matches m
    join public.prediction_match_scores s on s.match_id = m.id and s.prediction_id = v_prediction_id
    where m.stage in ('R32', 'R16', 'QF', 'SF', 'FINAL', 'THIRD_PLACE')
      and m.home_team_id is not null and m.away_team_id is not null
      and s.home_team_id is not null and s.away_team_id is not null
      and (
          (m.home_team_id = s.home_team_id and m.away_team_id = s.away_team_id) or
          (m.home_team_id = s.away_team_id and m.away_team_id = s.home_team_id)
      );

    get diagnostics v_points = row_count;
    return coalesce(v_points, 0);
end;
$$;

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
        select * from (values ('R32', 1), ('R16', 2), ('QF', 3), ('SF', 4)) as r(round, pts)
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
    values (p_ticket_id, 'champion_bonus', 'FINAL', 10, jsonb_build_object('champion', v_actual_champion));

    return 10;
end;
$$;

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
    values (p_ticket_id, 'third_place_bonus', 'THIRD_PLACE', 5, jsonb_build_object('third', v_actual_third));

    return 5;
end;
$$;

create or replace function public.recalculate_ticket_score(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ticket public.tickets%rowtype;
    v_prediction_id uuid;
    v_group_match_points int := 0;
    v_group_position_points int := 0;
    v_knockout_match_points int := 0;
    v_cross_points int := 0;
    v_advancement_points int := 0;
    v_champion_bonus int := 0;
    v_third_place_bonus int := 0;
    v_exact_count int := 0;
    v_result_count int := 0;
    v_total int := 0;
begin
    if not public.is_admin() then
        if not exists (select 1 from public.tickets where id = p_ticket_id and claimed_by_user_id = auth.uid()) then
            raise exception 'Sin permisos para recalcular este ticket.';
        end if;
    end if;

    select * into v_ticket from public.tickets where id = p_ticket_id;
    if not found then raise exception 'Ticket no encontrado.'; end if;

    select id into v_prediction_id from public.prediction_headers where ticket_id = p_ticket_id;
    if v_prediction_id is null then
        insert into public.ticket_scores (ticket_id, total_points, calculated_at)
        values (p_ticket_id, 0, now())
        on conflict (ticket_id) do update set total_points = 0, calculated_at = now();
        return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id, 'total_points', 0);
    end if;

    delete from public.score_details where ticket_id = p_ticket_id;

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'group_match', m.match_no::text,
           public.score_match(m.home_score, m.away_score, s.home_score, s.away_score) as points,
           jsonb_build_object('match_no', m.match_no, 'actual', jsonb_build_object('home', m.home_score, 'away', m.away_score), 'prediction', jsonb_build_object('home', s.home_score, 'away', s.away_score))
    from public.prediction_match_scores s
    join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.stage = 'GROUP' and m.status = 'official';

    select coalesce(sum(points), 0) into v_group_match_points from public.score_details where ticket_id = p_ticket_id and category = 'group_match';

    insert into public.score_details (ticket_id, category, item_ref, points, detail)
    select p_ticket_id, 'knockout_match', m.stage || ':' || m.match_no::text,
           public.score_match(m.home_score, m.away_score, s.home_score, s.away_score),
           jsonb_build_object('match_no', m.match_no, 'stage', m.stage, 'actual', jsonb_build_object('home', m.home_score, 'away', m.away_score), 'prediction', jsonb_build_object('home', s.home_score, 'away', s.away_score))
    from public.prediction_match_scores s
    join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.stage in ('R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL') and m.status = 'official';

    select coalesce(sum(points), 0) into v_knockout_match_points from public.score_details where ticket_id = p_ticket_id and category = 'knockout_match';

    select count(*) into v_exact_count
    from public.prediction_match_scores s join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.status = 'official' and m.home_score = s.home_score and m.away_score = s.away_score;

    select count(*) into v_result_count
    from public.prediction_match_scores s join public.matches m on m.id = s.match_id
    where s.prediction_id = v_prediction_id and m.status = 'official' and public.score_match(m.home_score, m.away_score, s.home_score, s.away_score) > 0;

    v_group_position_points := public.score_group_positions(p_ticket_id);
    v_cross_points          := public.score_bracket_crosses(p_ticket_id);
    v_advancement_points    := public.score_advancement(p_ticket_id);
    v_champion_bonus        := public.score_champion_bonus(p_ticket_id);
    v_third_place_bonus     := public.score_third_place_bonus(p_ticket_id);

    v_total := v_group_match_points + v_knockout_match_points + v_group_position_points + v_cross_points + v_advancement_points + v_champion_bonus + v_third_place_bonus;

    insert into public.ticket_scores (
        ticket_id, total_points, group_match_points, group_position_points, knockout_points,
        cross_points, advancement_points, champion_bonus, runner_up_bonus, exact_count, result_count, calculated_at
    ) values (
        p_ticket_id, v_total, v_group_match_points, v_group_position_points, v_knockout_match_points,
        v_cross_points, v_advancement_points, v_champion_bonus, v_third_place_bonus, v_exact_count, v_result_count, now()
    ) on conflict (ticket_id) do update set
        total_points = excluded.total_points,
        group_match_points = excluded.group_match_points,
        group_position_points = excluded.group_position_points,
        knockout_points = excluded.knockout_points,
        cross_points = excluded.cross_points,
        advancement_points = excluded.advancement_points,
        champion_bonus = excluded.champion_bonus,
        runner_up_bonus = excluded.runner_up_bonus,
        exact_count = excluded.exact_count,
        result_count = excluded.result_count,
        calculated_at = now();

    return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id, 'total_points', v_total);
end;
$$;
grant execute on function public.recalculate_ticket_score(uuid) to authenticated;

-- =============================================================================
-- 8) VIEWS: alias amigable "Ticket N" + stats por employee
-- =============================================================================

create or replace view public.v_ranking_public as
with numbered as (
    select t.*, row_number() over (partition by t.employee_id order by t.created_at)::int as ticket_seq
    from public.tickets t
    where t.status <> 'cancelled'
)
select
    row_number() over (order by coalesce(ts.total_points, 0) desc, coalesce(ts.exact_count, 0) desc, t.created_at asc)::int as rank,
    t.id as ticket_id,
    'Ticket ' || t.ticket_seq::text as alias,
    e.person_name as employee_name,
    e.area_id,
    coalesce(ts.total_points, 0)::int as points,
    coalesce(ts.exact_count, 0)::int as exact_count,
    coalesce(ts.result_count, 0)::int as result_count,
    (coalesce(ts.group_position_points,0) + coalesce(ts.cross_points,0) + coalesce(ts.advancement_points,0) + coalesce(ts.champion_bonus,0) + coalesce(ts.runner_up_bonus,0))::int as bonus_points,
    coalesce(ph.status, 'pending') as status
from numbered t
join public.employees e on e.id = t.employee_id
left join public.ticket_scores ts on ts.ticket_id = t.id
left join public.prediction_headers ph on ph.ticket_id = t.id;

create or replace view public.v_my_tickets as
with numbered as (
    select t.*, row_number() over (partition by t.employee_id order by t.created_at)::int as ticket_seq
    from public.tickets t
)
select
    t.id,
    'Ticket ' || t.ticket_seq::text as "codeMasked",
    t.status,
    coalesce(ph.status, 'pending') as "predictionStatus",
    coalesce(ts.total_points, 0) as points,
    e.person_name as "ownerName",
    e.area_id as "areaId",
    t.claimed_at as "claimedAt"
from numbered t
join public.employees e on e.id = t.employee_id
left join public.prediction_headers ph on ph.ticket_id = t.id
left join public.ticket_scores ts on ts.ticket_id = t.id
where t.claimed_by_user_id = auth.uid();

create or replace view public.v_employee_ticket_stats as
select
    e.id as employee_id,
    e.cedula,
    e.person_id,
    count(case when t.status <> 'cancelled' then 1 end)::int as tickets_sold,
    count(case when t.status = 'claimed' then 1 end)::int as tickets_claimed,
    count(case when t.status = 'sold' and t.claimed_by_user_id is null then 1 end)::int as tickets_pending
from public.employees e
left join public.tickets t on t.employee_id = e.id
group by e.id, e.cedula, e.person_id;

-- =============================================================================
-- Fin de 15_resync_v0_1_1.sql
-- =============================================================================
