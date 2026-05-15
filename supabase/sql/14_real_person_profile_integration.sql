-- 14_real_person_profile_integration.sql
-- Integración incremental con Edge Function pull-person-profile.
-- Reutiliza employees, tickets, profiles y prediction_headers. No introduce tabla ticket_sales.

create extension if not exists pgcrypto;

-- Columnas adicionales en employees para guardar el snapshot del Edge Function.
alter table public.employees add column if not exists area_name text;
alter table public.employees add column if not exists gender text;
alter table public.employees add column if not exists associated_worker_name text;
alter table public.employees add column if not exists email text;
alter table public.employees add column if not exists phone_number text;
alter table public.employees add column if not exists job_classification_code text;

-- Columnas adicionales en tickets para preservar contexto de la venta.
alter table public.tickets add column if not exists person_id text;
alter table public.tickets add column if not exists person_name text;
alter table public.tickets add column if not exists area_id text;
alter table public.tickets add column if not exists area_name text;
alter table public.tickets add column if not exists job_title text;
alter table public.tickets add column if not exists job_classification_code text;

-- Constraints e índices (idempotentes).
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'employees_cedula_unique') then
        alter table public.employees add constraint employees_cedula_unique unique (cedula);
    end if;
end $$;

create index if not exists idx_employees_person_id on public.employees (person_id);
create index if not exists idx_employees_area_name on public.employees (area_name);
create index if not exists idx_tickets_person_id on public.tickets (person_id);
create index if not exists idx_tickets_status_created on public.tickets (status, created_at desc);

-- Generador de códigos de ticket: WCX-XXXXXXXX con verificación de unicidad.
create or replace function public.generate_ticket_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    v_code text;
begin
    loop
        v_code := 'WCX-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
        exit when not exists (select 1 from public.tickets where code = v_code);
    end loop;

    return v_code;
end;
$$;

-- sell_ticket(7 args): venta desde Edge Function pull-person-profile.
-- Rechaza national_id vacío con mensaje específico. Si el colaborador no tiene cédula registrada en HR,
-- el admin debe gestionarla manualmente antes de poder vender.
create or replace function public.sell_ticket(
    p_person_id text,
    p_national_id text,
    p_person_name text,
    p_area_id text default null,
    p_area_name text default null,
    p_job_title text default null,
    p_job_classification_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin uuid := auth.uid();
    v_national_id text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
    v_person_id text := trim(coalesce(p_person_id, ''));
    v_person_name text := trim(coalesce(p_person_name, ''));
    v_employee public.employees%rowtype;
    v_code text;
    v_ticket_id uuid;
begin
    if v_admin is null then
        raise exception 'Usuario no autenticado.';
    end if;
    if not public.is_admin() then
        raise exception 'Solo admin_tthh o super_admin puede vender tickets.';
    end if;
    if v_person_id = '' then
        raise exception 'person_id es requerido.';
    end if;
    if v_national_id = '' then
        raise exception 'Este colaborador no tiene cédula registrada en HR. Cárgala manualmente antes de vender el ticket.';
    end if;
    if v_person_name = '' then
        raise exception 'person_name es requerido.';
    end if;

    insert into public.employees (
        cedula,
        person_id,
        person_name,
        area_id,
        area_name,
        cost_area,
        job_title,
        job_classification_code,
        is_active,
        source_updated_at,
        updated_at
    )
    values (
        v_national_id,
        v_person_id,
        v_person_name,
        nullif(trim(coalesce(p_area_id, '')), ''),
        nullif(trim(coalesce(p_area_name, '')), ''),
        nullif(trim(coalesce(p_area_name, '')), ''),
        nullif(trim(coalesce(p_job_title, '')), ''),
        nullif(trim(coalesce(p_job_classification_code, '')), ''),
        true,
        now(),
        now()
    )
    on conflict (cedula)
    do update set
        person_id = excluded.person_id,
        person_name = excluded.person_name,
        area_id = excluded.area_id,
        area_name = excluded.area_name,
        cost_area = excluded.cost_area,
        job_title = excluded.job_title,
        job_classification_code = excluded.job_classification_code,
        is_active = true,
        source_updated_at = now(),
        updated_at = now()
    returning * into v_employee;

    v_code := public.generate_ticket_code();

    insert into public.tickets (
        code,
        employee_id,
        cedula,
        person_id,
        person_name,
        area_id,
        area_name,
        job_title,
        job_classification_code,
        sold_by_user_id,
        status,
        purchase_amount
    )
    values (
        v_code,
        v_employee.id,
        v_employee.cedula,
        v_employee.person_id,
        v_employee.person_name,
        v_employee.area_id,
        v_employee.area_name,
        v_employee.job_title,
        v_employee.job_classification_code,
        v_admin,
        'sold',
        null
    )
    returning id into v_ticket_id;

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (
        v_admin,
        'sell_ticket_real_person_profile',
        'tickets',
        v_ticket_id,
        jsonb_build_object(
            'cedula_masked', left(v_employee.cedula, 2) || '******' || right(v_employee.cedula, 2),
            'person_id', v_employee.person_id,
            'code_masked', left(v_code, 4) || '****'
        )
    );

    return jsonb_build_object(
        'ok', true,
        'ticket_id', v_ticket_id,
        'code', v_code,
        'employee_name', v_employee.person_name,
        'cedula_masked', left(v_employee.cedula, 2) || '******' || right(v_employee.cedula, 2)
    );
end;
$$;

-- Reutiliza sell_ticket(cedula, monto) original definido en 07_functions_tickets.sql.
-- claim_ticket(p_code text) ya está definido en 07_functions_tickets.sql y es la firma que usa el cliente.
-- NO redefinimos claim_ticket aquí para evitar overload incompatible.

comment on function public.sell_ticket(text, text, text, text, text, text, text) is 'Vende ticket usando colaborador real consultado por Edge Function pull-person-profile. No llama APIs externas desde SQL.';

grant execute on function public.sell_ticket(text, text, text, text, text, text, text) to authenticated;
