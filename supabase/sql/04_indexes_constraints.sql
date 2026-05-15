-- 04_indexes_constraints.sql
-- Índices, únicos y checks.

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'employees_cedula_unique') then
        alter table public.employees add constraint employees_cedula_unique unique (cedula);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'profiles_user_unique') then
        alter table public.profiles add constraint profiles_user_unique unique (user_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'profiles_cedula_unique') then
        alter table public.profiles add constraint profiles_cedula_unique unique (cedula);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'teams_fifa_code_unique') then
        alter table public.teams add constraint teams_fifa_code_unique unique (fifa_code);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'matches_match_no_unique') then
        alter table public.matches add constraint matches_match_no_unique unique (match_no);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'tickets_code_unique') then
        alter table public.tickets add constraint tickets_code_unique unique (code);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'prediction_headers_ticket_unique') then
        alter table public.prediction_headers add constraint prediction_headers_ticket_unique unique (ticket_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'prediction_match_scores_unique') then
        alter table public.prediction_match_scores add constraint prediction_match_scores_unique unique (prediction_id, match_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'predicted_group_standings_unique') then
        alter table public.predicted_group_standings add constraint predicted_group_standings_unique unique (prediction_id, group_code, team_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'actual_group_standings_unique') then
        alter table public.actual_group_standings add constraint actual_group_standings_unique unique (group_code, team_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'ticket_scores_ticket_unique') then
        alter table public.ticket_scores add constraint ticket_scores_ticket_unique unique (ticket_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'prediction_third_place_assignments_unique') then
        alter table public.prediction_third_place_assignments add constraint prediction_third_place_assignments_unique unique (prediction_id, slot_match_id);
    end if;
end $$;

create index if not exists idx_prediction_third_place_assignments_prediction on public.prediction_third_place_assignments (prediction_id);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('collaborator', 'admin_tthh', 'super_admin'));

alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check check (status in ('sold', 'claimed', 'cancelled'));

alter table public.prediction_headers drop constraint if exists prediction_headers_status_check;
alter table public.prediction_headers add constraint prediction_headers_status_check check (status in ('pending', 'in_progress', 'submitted', 'locked'));

alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches add constraint matches_stage_check check (stage in ('GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'));

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check check (status in ('scheduled', 'live', 'official'));

alter table public.matches drop constraint if exists matches_score_nonnegative_check;
alter table public.matches add constraint matches_score_nonnegative_check check (
    (home_score is null or home_score >= 0) and (away_score is null or away_score >= 0)
);

alter table public.prediction_match_scores drop constraint if exists prediction_score_nonnegative_check;
alter table public.prediction_match_scores add constraint prediction_score_nonnegative_check check (
    (home_score is null or home_score >= 0) and (away_score is null or away_score >= 0)
);

create index if not exists idx_employees_cedula on public.employees (cedula);
create index if not exists idx_employees_person_id on public.employees (person_id);
create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_profiles_cedula on public.profiles (cedula);
create index if not exists idx_tickets_cedula on public.tickets (cedula);
create index if not exists idx_tickets_person_id on public.tickets (person_id);
create index if not exists idx_tickets_employee_id on public.tickets (employee_id);
create index if not exists idx_tickets_claimed_by on public.tickets (claimed_by_user_id);
create index if not exists idx_prediction_headers_ticket on public.prediction_headers (ticket_id);
create index if not exists idx_prediction_headers_user on public.prediction_headers (user_id);
create index if not exists idx_prediction_scores_match on public.prediction_match_scores (match_id);
create index if not exists idx_score_details_ticket on public.score_details (ticket_id);
create index if not exists idx_matches_stage_group on public.matches (stage, group_code);
