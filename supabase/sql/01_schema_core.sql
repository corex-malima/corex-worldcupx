-- 01_schema_core.sql
-- Núcleo de colaboradores, perfiles, configuración y auditoría.

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    cedula text not null,
    person_id text,
    person_name text not null,
    area_id text,
    cost_area text,
    job_title text,
    is_active boolean not null default true,
    source_updated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.employees add column if not exists source_updated_at timestamptz;

create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    employee_id uuid references public.employees(id),
    cedula text not null,
    display_name text not null,
    area_id text,
    role text not null default 'collaborator',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.app_config (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null,
    action text not null,
    target_table text,
    target_id uuid,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table public.employees is 'Colaboradores cargados por TTHH. La cédula define elegibilidad, no autenticación.';
comment on table public.profiles is 'Perfil de aplicación vinculado a auth.users y employees.';
comment on table public.app_config is 'Configuraciones parametrizables: deadline, reglas de scoring, flags.';
