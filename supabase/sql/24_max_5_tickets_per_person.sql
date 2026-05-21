-- 24_max_5_tickets_per_person.sql
-- Impone un límite de 5 tickets ACTIVOS (no cancelados) por persona.
--
-- REGLA:
--   - Suma de tickets en status 'sold' o 'claimed' por employee_id <= 5
--   - Tickets 'cancelled' NO cuentan — anular libera espacio
--
-- Aplica a las 2 sobrecargas de sell_ticket:
--   - sell_ticket(p_cedula text) — cuando el colaborador ya existe en employees
--   - sell_ticket(p_person_id, p_national_id, p_person_name, ...) — cuando viene
--     del search service y eventualmente upsert al catálogo employees
--
-- Conserva:
--   - Check admin (`is_admin()`)
--   - Check deadline (`is_deadline_passed()`)
--   - Resto del comportamiento
--
-- Idempotente: re-ejecutar no rompe nada.

-- =============================================================================
-- 1) sell_ticket(p_cedula) — versión simple
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
    v_active_count int;
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

    -- LÍMITE: máximo 5 tickets activos (no cancelados) por persona
    select count(*) into v_active_count
    from public.tickets
    where employee_id = v_employee.id
      and status <> 'cancelled';

    if v_active_count >= 5 then
        raise exception 'El colaborador ya tiene 5 tickets activos (límite máximo). Anula uno para liberar espacio.';
    end if;

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
-- 2) sell_ticket(p_person_id, ... full) — versión usada por el search service
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
    v_active_count int;
    v_code text;
    v_ticket_id uuid;
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

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'sell_ticket', 'tickets', v_ticket_id, jsonb_build_object('code', v_code, 'national_id', p_national_id));

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket_id, 'code', v_code);
end;
$$;
grant execute on function public.sell_ticket(text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
