-- 02_schema_tournament.sql
-- Selecciones, grupos, partidos y slots de bracket.

create table if not exists public.tournament_groups (
    code text primary key,
    name text not null,
    sort_order int not null
);

create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    fifa_code text not null,
    name text not null,
    group_code text references public.tournament_groups(code),
    flag_emoji text,
    flag_url text,
    primary_color text,
    secondary_color text,
    seed_order int not null default 999,
    created_at timestamptz not null default now()
);

create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    match_no int not null,
    stage text not null,
    group_code text references public.tournament_groups(code),
    home_team_id uuid references public.teams(id),
    away_team_id uuid references public.teams(id),
    home_slot text,
    away_slot text,
    match_datetime timestamptz,
    venue text,
    status text not null default 'scheduled',
    home_score int,
    away_score int,
    penalty_winner_team_id uuid references public.teams(id),
    winner_team_id uuid references public.teams(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bracket_slots (
    id uuid primary key default gen_random_uuid(),
    stage text not null,
    slot_code text not null,
    source_slot text,
    target_match_no int,
    target_side text,
    created_at timestamptz not null default now()
);

comment on table public.matches is 'Partidos oficiales o futuros. Permite team_id conocido o slot textual si el equipo aún no se conoce.';
