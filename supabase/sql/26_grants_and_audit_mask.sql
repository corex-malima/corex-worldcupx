-- 26_grants_and_audit_mask.sql
-- Bloqueadores detectados en auditoría pre-producción:
--
-- 1. `v_my_tickets` y `v_employee_ticket_stats` se crearon en file 15 sin
--    GRANT explícito. En PostgREST, las vistas requieren grant para ser
--    accesibles vía API. Sin esto:
--      - DashboardPage del colaborador queda vacío (useTickets falla)
--      - Counter "X/5" en SellTicketPanel siempre muestra 0
--      - Frontend ve error silencioso (return EMPTY)
--
-- 2. `sell_ticket(p_person_id, ...)` versión full en file 24 inserta la
--    cédula COMPLETA en `admin_audit_log.payload`. Política interna:
--    enmascarar todo PII en logs aunque sean accesibles solo por admins.
--    Recreamos la función guardando solo los últimos 4 dígitos.
--
-- Idempotente. Re-ejecutar no rompe nada.

-- =============================================================================
-- 1) GRANTs faltantes (BLOQUEADOR pre-producción)
-- =============================================================================
grant select on public.v_my_tickets to authenticated;
grant select on public.v_employee_ticket_stats to authenticated;

-- =============================================================================
-- 2) sell_ticket full: enmascarar national_id en audit log
-- =============================================================================
-- Recreamos preservando: admin-only, deadline block, max-5 tickets check,
-- y todo el resto del comportamiento de file 24. Solo cambia el payload
-- de audit_log para no guardar la cédula completa.

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
    v_active_count int;
    v_code text;
    v_ticket_id uuid;
    v_clean_national_id text;
    v_masked_cedula text;
begin
    if v_admin is null then raise exception 'Usuario no autenticado.'; end if;
    if not public.is_admin() then raise exception 'Solo TTHH puede vender tickets.'; end if;
    if public.is_deadline_passed() then raise exception 'El deadline ya pasó. La venta de tickets está cerrada.'; end if;

    -- Upsert del empleado en catálogo
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

    -- LÍMITE: máximo 5 tickets activos (no cancelados) por persona
    select count(*) into v_active_count
    from public.tickets
    where employee_id = v_employee_id
      and status <> 'cancelled';

    if v_active_count >= 5 then
        raise exception 'El colaborador ya tiene 5 tickets activos (límite máximo). Anula uno para liberar espacio.';
    end if;

    v_code := public.generate_ticket_code();

    insert into public.tickets (code, employee_id, cedula, person_id, person_name,
                                area_id, area_name, job_title, job_classification_code,
                                sold_by_user_id, status)
    values (v_code, v_employee_id, p_national_id, p_person_id, p_person_name,
            p_area_id, p_area_name, p_job_title, p_job_classification_code,
            v_admin, 'sold')
    returning id into v_ticket_id;

    -- Enmascarar cédula para el audit log: solo últimos 4 dígitos
    v_clean_national_id := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
    v_masked_cedula := case
        when length(v_clean_national_id) >= 4
            then repeat('*', greatest(length(v_clean_national_id) - 4, 0)) || right(v_clean_national_id, 4)
        else v_clean_national_id
    end;

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'sell_ticket', 'tickets', v_ticket_id,
            jsonb_build_object('code', v_code, 'cedula_masked', v_masked_cedula));

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket_id, 'code', v_code);
end;
$$;
grant execute on function public.sell_ticket(text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

-- =============================================================================
-- 3) VERIFICACIÓN
-- =============================================================================
do $$
declare
    v_my_tickets_grant int;
    v_employee_stats_grant int;
begin
    select count(*) into v_my_tickets_grant
    from information_schema.role_table_grants
    where table_schema='public' and table_name='v_my_tickets'
      and grantee='authenticated' and privilege_type='SELECT';

    select count(*) into v_employee_stats_grant
    from information_schema.role_table_grants
    where table_schema='public' and table_name='v_employee_ticket_stats'
      and grantee='authenticated' and privilege_type='SELECT';

    if v_my_tickets_grant = 1 and v_employee_stats_grant = 1 then
        raise notice '✓ GRANTs aplicados: v_my_tickets + v_employee_ticket_stats accesibles para authenticated. Dashboard del colaborador funcionará.';
    else
        raise warning '⚠ GRANTs incompletos: v_my_tickets=% v_employee_ticket_stats=%', v_my_tickets_grant, v_employee_stats_grant;
    end if;
end$$;
