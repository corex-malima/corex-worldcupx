-- 06_functions_auth_profiles.sql
-- Funciones de perfil, registro con ticket y helpers de seguridad.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid()
          and p.role in ('admin_tthh', 'super_admin')
    );
$$;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
    select p.* from public.profiles p where p.user_id = auth.uid() limit 1;
$$;

create or replace function public.technical_email_for_employee(p_cedula text, p_person_name text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
    v_cedula text := regexp_replace(coalesce(p_cedula, ''), '\D', '', 'g');
    v_last_name text := regexp_replace(trim(coalesce(p_person_name, 'colaborador')), '^.*\s+', '');
begin
    v_last_name := lower(translate(v_last_name, 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouAEIOUnNuU'));
    v_last_name := regexp_replace(v_last_name, '[^a-z0-9]+', '', 'g');
    if v_last_name = '' then
        v_last_name := 'colaborador';
    end if;
    return v_cedula || '.' || v_last_name || '@mundial.malima';
end;
$$;

create or replace function public.validate_active_employee(p_cedula text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_employee public.employees%rowtype;
begin
    select * into v_employee
    from public.employees
    where cedula = regexp_replace(p_cedula, '\D', '', 'g')
      and is_active = true;

    if not found then
        return jsonb_build_object('ok', false, 'message', 'La cédula no corresponde a un colaborador activo.');
    end if;

    return jsonb_build_object(
        'ok', true,
        'employee_id', v_employee.id,
        'person_name', v_employee.person_name,
        'area_id', v_employee.area_id
    );
end;
$$;

create or replace function public.validate_registration_ticket(p_cedula text, p_ticket_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_cedula text := regexp_replace(coalesce(p_cedula, ''), '\D', '', 'g');
    v_code text := upper(trim(coalesce(p_ticket_code, '')));
    v_employee public.employees%rowtype;
    v_ticket public.tickets%rowtype;
begin
    select * into v_employee
    from public.employees
    where cedula = v_cedula
      and is_active = true;

    if not found then
        return jsonb_build_object('ok', false, 'message', 'Datos no válidos o ticket no disponible.');
    end if;

    select * into v_ticket
    from public.tickets
    where code = v_code
      and cedula = v_cedula
      and status = 'sold'
      and claimed_by_user_id is null
    limit 1;

    if not found then
        return jsonb_build_object('ok', false, 'message', 'Datos no válidos o ticket no disponible.');
    end if;

    if exists (select 1 from public.profiles where cedula = v_cedula) then
        return jsonb_build_object('ok', false, 'message', 'Esta cédula ya tiene cuenta. Ingresa y activa tickets adicionales desde tu panel.');
    end if;

    return jsonb_build_object(
        'ok', true,
        'ticket_id', v_ticket.id,
        'employee_id', v_employee.id,
        'person_name', v_employee.person_name,
        'area_id', v_employee.area_id,
        'cedula_masked', left(v_employee.cedula, 2) || '******' || right(v_employee.cedula, 2),
        'technical_email', public.technical_email_for_employee(v_employee.cedula, v_employee.person_name)
    );
end;
$$;

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
    select user_id into v_user_id
    from public.profiles
    where cedula = v_cedula
    limit 1;

    if v_user_id is null then
        return jsonb_build_object('ok', false, 'message', 'Credenciales inválidas.');
    end if;

    -- Lee el email real desde auth.users (robusto frente a cualquier convención de naming).
    select email into v_email
    from auth.users
    where id = v_user_id
    limit 1;

    if v_email is null then
        return jsonb_build_object('ok', false, 'message', 'Credenciales inválidas.');
    end if;

    return jsonb_build_object('ok', true, 'technical_email', v_email);
end;
$$;

create or replace function public.register_profile_by_cedula(p_cedula text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_cedula text := regexp_replace(p_cedula, '\D', '', 'g');
    v_employee public.employees%rowtype;
    v_profile_id uuid;
begin
    if v_user_id is null then
        raise exception 'Usuario no autenticado.';
    end if;

    select * into v_employee
    from public.employees
    where cedula = v_cedula
      and is_active = true;

    if not found then
        raise exception 'La cédula no está habilitada como colaborador activo.';
    end if;

    if exists (select 1 from public.profiles where user_id = v_user_id) then
        raise exception 'El usuario ya tiene perfil.';
    end if;

    if exists (select 1 from public.profiles where cedula = v_cedula) then
        raise exception 'La cédula ya fue registrada.';
    end if;

    insert into public.profiles (user_id, employee_id, cedula, display_name, area_id, role)
    values (v_user_id, v_employee.id, v_employee.cedula, v_employee.person_name, v_employee.area_id, 'collaborator')
    returning id into v_profile_id;

    return jsonb_build_object('ok', true, 'profile_id', v_profile_id);
end;
$$;

comment on function public.register_profile_by_cedula(text) is 'Debe llamarse después de crear auth.users. Valida colaborador activo y crea perfil vinculado.';
comment on function public.validate_registration_ticket(text, text) is 'Validación previa de cédula + ticket vendido para habilitar registro sin revelar datos si el par no coincide.';
comment on function public.resolve_auth_email_by_cedula(text) is 'Resuelve el email técnico usado por Supabase Auth para login con cédula.';

grant execute on function public.validate_registration_ticket(text, text) to anon, authenticated;
grant execute on function public.resolve_auth_email_by_cedula(text) to anon, authenticated;

-- Reemplazo de políticas admin con is_admin() para evitar recursión RLS.
-- (Las versiones inline de 05_rls_policies.sql introducían un subselect a profiles
-- que rompía el SELECT del propio dueño cuando se evaluaban las dos políticas juntas.)
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
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'prediction_third_place_assignments') then
        drop policy if exists third_place_admin_select on public.prediction_third_place_assignments;
        create policy third_place_admin_select on public.prediction_third_place_assignments for select using (public.is_admin());
    end if;
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'admin_audit_log') then
        drop policy if exists audit_admin_select on public.admin_audit_log;
        create policy audit_admin_select on public.admin_audit_log for select using (public.is_admin());
    end if;
end $$;
