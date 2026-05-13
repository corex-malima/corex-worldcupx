-- 07_functions_tickets.sql
-- Venta, reclamo, generación y anulación de tickets.

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
    -- 6 caracteres, sin símbolos ambiguos. La unicidad se garantiza en tickets.code.
    v_code := upper(substring(translate(encode(gen_random_bytes(6), 'base64'), '+/=', '') from 1 for 6));
    v_code := regexp_replace(v_code, '[^A-Z0-9]', 'X', 'g');
    return v_code;
end;
$$;

create or replace function public.sell_ticket(p_cedula text, p_purchase_amount numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin uuid := auth.uid();
    v_cedula text := regexp_replace(p_cedula, '\D', '', 'g');
    v_employee public.employees%rowtype;
    v_code text;
    v_ticket_id uuid;
    v_try int := 0;
begin
    if v_admin is null then
        raise exception 'Usuario no autenticado.';
    end if;
    if not public.is_admin() then
        raise exception 'Solo admin_tthh o super_admin puede vender tickets.';
    end if;

    select * into v_employee from public.employees where cedula = v_cedula and is_active = true;
    if not found then
        raise exception 'Colaborador no encontrado o inactivo.';
    end if;

    loop
        v_try := v_try + 1;
        v_code := public.generate_ticket_code();
        begin
            insert into public.tickets (code, employee_id, cedula, sold_by_user_id, status, purchase_amount)
            values (v_code, v_employee.id, v_employee.cedula, v_admin, 'sold', p_purchase_amount)
            returning id into v_ticket_id;
            exit;
        exception when unique_violation then
            if v_try >= 30 then
                raise exception 'No se pudo generar código único después de % intentos.', v_try;
            end if;
        end;
    end loop;

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'sell_ticket', 'tickets', v_ticket_id, jsonb_build_object('cedula', v_employee.cedula, 'code_masked', left(v_code, 2) || '••••'));

    return jsonb_build_object(
        'ok', true,
        'ticket_id', v_ticket_id,
        'code', v_code,
        'employee_name', v_employee.person_name,
        'cedula_masked', left(v_employee.cedula, 2) || '******' || right(v_employee.cedula, 2)
    );
end;
$$;

create or replace function public.claim_ticket(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_code text := upper(trim(p_code));
    v_profile public.profiles%rowtype;
    v_ticket public.tickets%rowtype;
    v_prediction_id uuid;
begin
    if v_user is null then
        raise exception 'Usuario no autenticado.';
    end if;

    select * into v_profile from public.profiles where user_id = v_user;
    if not found then
        raise exception 'Perfil no encontrado.';
    end if;

    select * into v_ticket from public.tickets where code = v_code for update;
    if not found then
        raise exception 'El código no existe.';
    end if;
    if v_ticket.status = 'cancelled' then
        raise exception 'El ticket está anulado.';
    end if;
    if v_ticket.status = 'claimed' or v_ticket.claimed_by_user_id is not null then
        raise exception 'El ticket ya fue reclamado.';
    end if;
    if v_ticket.cedula <> v_profile.cedula then
        raise exception 'El ticket no pertenece a esta cédula.';
    end if;

    update public.tickets
    set status = 'claimed', claimed_by_user_id = v_user, claimed_at = now(), updated_at = now()
    where id = v_ticket.id;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (v_ticket.id, v_user, 'pending')
    on conflict (ticket_id) do update set user_id = excluded.user_id
    returning id into v_prediction_id;

    return jsonb_build_object('ok', true, 'ticket_id', v_ticket.id, 'prediction_id', v_prediction_id);
end;
$$;

create or replace function public.complete_registration_with_ticket(p_cedula text, p_ticket_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_cedula text := regexp_replace(coalesce(p_cedula, ''), '\D', '', 'g');
    v_code text := upper(trim(coalesce(p_ticket_code, '')));
    v_employee public.employees%rowtype;
    v_ticket public.tickets%rowtype;
    v_profile public.profiles%rowtype;
    v_profile_id uuid;
    v_prediction_id uuid;
begin
    if v_user is null then
        raise exception 'Usuario no autenticado.';
    end if;

    select * into v_employee
    from public.employees
    where cedula = v_cedula
      and is_active = true;

    if not found then
        raise exception 'Datos no válidos o ticket no disponible.';
    end if;

    select * into v_ticket
    from public.tickets
    where code = v_code
      and cedula = v_cedula
    for update;

    if not found then
        raise exception 'Datos no válidos o ticket no disponible.';
    end if;
    if v_ticket.status = 'cancelled' then
        raise exception 'Datos no válidos o ticket no disponible.';
    end if;
    if v_ticket.status = 'claimed' or v_ticket.claimed_by_user_id is not null then
        raise exception 'El ticket ya fue reclamado.';
    end if;
    if v_ticket.status <> 'sold' then
        raise exception 'Datos no válidos o ticket no disponible.';
    end if;

    select * into v_profile
    from public.profiles
    where cedula = v_cedula
    limit 1;

    if found and v_profile.user_id <> v_user then
        raise exception 'La cédula ya fue registrada.';
    end if;

    if found then
        v_profile_id := v_profile.id;
    else
        insert into public.profiles (user_id, employee_id, cedula, display_name, area_id, role)
        values (v_user, v_employee.id, v_employee.cedula, v_employee.person_name, v_employee.area_id, 'collaborator')
        returning id into v_profile_id;
    end if;

    update public.tickets
    set status = 'claimed',
        claimed_by_user_id = v_user,
        claimed_at = now(),
        updated_at = now()
    where id = v_ticket.id;

    insert into public.prediction_headers (ticket_id, user_id, status)
    values (v_ticket.id, v_user, 'pending')
    on conflict (ticket_id) do update
      set user_id = excluded.user_id,
          updated_at = now()
    returning id into v_prediction_id;

    return jsonb_build_object(
        'ok', true,
        'profile_id', v_profile_id,
        'ticket_id', v_ticket.id,
        'prediction_id', v_prediction_id
    );
end;
$$;

comment on function public.complete_registration_with_ticket(text, text) is 'Completa registro colaborador: crea perfil, reclama ticket vendido y crea prediction_headers en una transacción RPC autenticada.';
grant execute on function public.complete_registration_with_ticket(text, text) to authenticated;

create or replace function public.cancel_ticket(p_ticket_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin uuid := auth.uid();
begin
    if v_admin is null then
        raise exception 'Usuario no autenticado.';
    end if;
    if not public.is_admin() then
        raise exception 'Solo admin_tthh o super_admin puede anular tickets.';
    end if;
    if coalesce(trim(p_reason), '') = '' then
        raise exception 'Debe ingresar motivo de anulación.';
    end if;

    update public.tickets
    set status = 'cancelled', cancelled_by_user_id = v_admin, cancellation_reason = p_reason, updated_at = now()
    where id = p_ticket_id;

    if not found then
        raise exception 'Ticket no encontrado.';
    end if;

    update public.prediction_headers set status = 'locked', locked_at = now(), updated_at = now()
    where ticket_id = p_ticket_id;

    insert into public.admin_audit_log (admin_user_id, action, target_table, target_id, payload)
    values (v_admin, 'cancel_ticket', 'tickets', p_ticket_id, jsonb_build_object('reason', p_reason));

    return jsonb_build_object('ok', true, 'ticket_id', p_ticket_id);
end;
$$;
