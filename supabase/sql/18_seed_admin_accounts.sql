-- 18_seed_admin_accounts.sql
-- Crea las cuentas admin estándar para que TTHH pueda operar la app sin
-- pelearse con flujo de tickets antes de empezar a vender. Cédulas reservadas
-- (no chocan con cédulas ecuatorianas reales porque ninguna provincia empieza
-- con 00):
--
--   0000000001  / WorldCupX2026!   → super_admin · "ADMIN MAESTRO"
--   0000000002  / TTHH2026!        → admin_tthh  · "ADMIN TTHH"
--
-- Idempotente: re-ejecutar no rompe nada. Si la cuenta auth ya existe,
-- solamente resetea la password y sincroniza el role en profiles.
--
-- IMPORTANTE: cambia las passwords aquí ANTES de correrlo en producción
-- (variables p_password dentro del DO block). Una vez creados, los admins
-- también pueden cambiarlas desde Supabase Dashboard → Authentication → Users.

do $$
declare
    accounts jsonb := jsonb_build_array(
        jsonb_build_object(
            'cedula',  '0000000001',
            'name',    'ADMIN MAESTRO',
            'area',    'ADMIN',
            'role',    'super_admin',
            'password','WorldCupX2026!'
        ),
        jsonb_build_object(
            'cedula',  '0000000002',
            'name',    'ADMIN TTHH',
            'area',    'TTHH',
            'role',    'admin_tthh',
            'password','TTHH2026!'
        )
    );
    a jsonb;
    v_cedula       text;
    v_person_name  text;
    v_area_id      text;
    v_role         text;
    v_password     text;
    v_email        text;
    v_employee_id  uuid;
    v_user_id      uuid;
begin
    for a in select * from jsonb_array_elements(accounts) loop
        v_cedula      := a->>'cedula';
        v_person_name := a->>'name';
        v_area_id     := a->>'area';
        v_role        := a->>'role';
        v_password    := a->>'password';

        v_email := public.technical_email_for_employee(v_cedula, v_person_name);

        -- 1) Employee (insert or update)
        insert into public.employees (cedula, person_id, person_name, area_id, area_name, job_title, is_active)
        values (v_cedula, v_cedula, upper(v_person_name), v_area_id, v_area_id, 'Administrador', true)
        on conflict (cedula) do update set
            person_name = excluded.person_name,
            area_id     = excluded.area_id,
            is_active   = true,
            updated_at  = now()
        returning id into v_employee_id;
        if v_employee_id is null then
            select id into v_employee_id from public.employees where cedula = v_cedula limit 1;
        end if;

        -- 2) Auth user (insert or update password)
        select id into v_user_id from auth.users where email = v_email;
        if v_user_id is null then
            v_user_id := gen_random_uuid();
            insert into auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at, confirmation_token, email_change,
                email_change_token_new, recovery_token
            ) values (
                '00000000-0000-0000-0000-000000000000',
                v_user_id, 'authenticated', 'authenticated',
                v_email, crypt(v_password, gen_salt('bf')), now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('cedula', v_cedula, 'name', v_person_name),
                now(), now(), '', '', '', ''
            );
            insert into auth.identities (
                id, user_id, provider, provider_id, identity_data,
                last_sign_in_at, created_at, updated_at
            ) values (
                gen_random_uuid(), v_user_id, 'email', v_user_id::text,
                jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
                now(), now(), now()
            );
        else
            -- Resync password si el script se re-ejecuta
            update auth.users
            set encrypted_password = crypt(v_password, gen_salt('bf')),
                email_confirmed_at = now(),
                updated_at         = now()
            where id = v_user_id;
        end if;

        -- 3) Profile con rol admin
        insert into public.profiles (user_id, employee_id, cedula, display_name, area_id, role)
        values (v_user_id, v_employee_id, v_cedula, upper(v_person_name), v_area_id, v_role)
        on conflict (user_id) do update set
            employee_id  = excluded.employee_id,
            cedula       = excluded.cedula,
            display_name = excluded.display_name,
            area_id      = excluded.area_id,
            role         = v_role,
            updated_at   = now();

        raise notice 'OK admin · cedula=% · role=% · email=%', v_cedula, v_role, v_email;
    end loop;
end $$;

-- Validación visual: deben aparecer 2 filas con confirmado=true
select p.cedula, p.display_name, p.role,
       u.email, (u.email_confirmed_at is not null) as confirmado
from public.profiles p
join auth.users u on u.id = p.user_id
where p.role in ('super_admin', 'admin_tthh')
order by p.role, p.cedula;
