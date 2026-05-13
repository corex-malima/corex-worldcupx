-- 03_schema_predictions.sql
-- Tickets, predicciones, resultados calculados y puntajes.

create table if not exists public.tickets (
    id uuid primary key default gen_random_uuid(),
    code text not null,
    employee_id uuid not null references public.employees(id),
    cedula text not null,
    sold_by_user_id uuid not null,
    status text not null default 'sold',
    claimed_by_user_id uuid references auth.users(id),
    claimed_at timestamptz,
    cancelled_by_user_id uuid references auth.users(id),
    cancellation_reason text,
    purchase_amount numeric(12,2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.prediction_headers (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.tickets(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending',
    champion_team_id uuid references public.teams(id),
    runner_up_team_id uuid references public.teams(id),
    submitted_at timestamptz,
    locked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.prediction_match_scores (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.prediction_headers(id) on delete cascade,
    match_id uuid not null references public.matches(id) on delete cascade,
    stage text not null,
    home_team_id uuid references public.teams(id),
    away_team_id uuid references public.teams(id),
    home_score int,
    away_score int,
    penalty_winner_team_id uuid references public.teams(id),
    winner_team_id uuid references public.teams(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.predicted_group_standings (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.prediction_headers(id) on delete cascade,
    group_code text not null,
    team_id uuid not null references public.teams(id),
    played int not null default 0,
    points int not null default 0,
    goals_for int not null default 0,
    goals_against int not null default 0,
    goal_difference int not null default 0,
    position int not null,
    created_at timestamptz not null default now()
);

create table if not exists public.predicted_bracket_slots (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.prediction_headers(id) on delete cascade,
    stage text not null,
    slot_code text not null,
    match_id uuid references public.matches(id),
    team_id uuid references public.teams(id),
    source text,
    created_at timestamptz not null default now()
);

create table if not exists public.actual_group_standings (
    id uuid primary key default gen_random_uuid(),
    group_code text not null,
    team_id uuid not null references public.teams(id),
    played int not null default 0,
    points int not null default 0,
    goals_for int not null default 0,
    goals_against int not null default 0,
    goal_difference int not null default 0,
    position int not null,
    calculated_at timestamptz not null default now()
);

create table if not exists public.actual_bracket_slots (
    id uuid primary key default gen_random_uuid(),
    stage text not null,
    slot_code text not null,
    match_id uuid references public.matches(id),
    team_id uuid references public.teams(id),
    source text,
    calculated_at timestamptz not null default now()
);

create table if not exists public.ticket_scores (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.tickets(id) on delete cascade,
    total_points int not null default 0,
    group_match_points int not null default 0,
    group_position_points int not null default 0,
    knockout_points int not null default 0,
    cross_points int not null default 0,
    advancement_points int not null default 0,
    champion_bonus int not null default 0,
    runner_up_bonus int not null default 0,
    exact_count int not null default 0,
    result_count int not null default 0,
    calculated_at timestamptz not null default now()
);

create table if not exists public.score_details (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.tickets(id) on delete cascade,
    category text not null,
    item_ref text,
    points int not null default 0,
    detail jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
