-- 05_rls_policies.sql
-- RLS base. Evita funciones helper para permitir ejecutar antes de 06_functions_auth_profiles.sql.

alter table public.employees enable row level security;
alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.tournament_groups enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.bracket_slots enable row level security;
alter table public.tickets enable row level security;
alter table public.prediction_headers enable row level security;
alter table public.prediction_match_scores enable row level security;
alter table public.predicted_group_standings enable row level security;
alter table public.predicted_bracket_slots enable row level security;
alter table public.actual_group_standings enable row level security;
alter table public.actual_bracket_slots enable row level security;
alter table public.ticket_scores enable row level security;
alter table public.score_details enable row level security;

-- Limpieza idempotente de políticas principales.
drop policy if exists employees_admin_select on public.employees;
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;
drop policy if exists public_config_select on public.app_config;
drop policy if exists admin_config_all on public.app_config;
drop policy if exists audit_admin_select on public.admin_audit_log;
drop policy if exists tournament_authenticated_select on public.tournament_groups;
drop policy if exists teams_authenticated_select on public.teams;
drop policy if exists matches_authenticated_select on public.matches;
drop policy if exists bracket_slots_authenticated_select on public.bracket_slots;
drop policy if exists tickets_owner_select on public.tickets;
drop policy if exists tickets_admin_select on public.tickets;
drop policy if exists prediction_owner_select on public.prediction_headers;
drop policy if exists prediction_owner_update on public.prediction_headers;
drop policy if exists prediction_admin_select on public.prediction_headers;
drop policy if exists prediction_scores_owner_select on public.prediction_match_scores;
drop policy if exists prediction_scores_owner_write on public.prediction_match_scores;
drop policy if exists prediction_scores_admin_select on public.prediction_match_scores;
drop policy if exists standings_owner_select on public.predicted_group_standings;
drop policy if exists bracket_owner_select on public.predicted_bracket_slots;
drop policy if exists actual_authenticated_select on public.actual_group_standings;
drop policy if exists actual_bracket_authenticated_select on public.actual_bracket_slots;
drop policy if exists scores_owner_select on public.ticket_scores;
drop policy if exists scores_details_owner_select on public.score_details;

-- Admin predicate inline.
create policy employees_admin_select on public.employees for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy profiles_self_select on public.profiles for select using (user_id = auth.uid());
create policy profiles_admin_select on public.profiles for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy public_config_select on public.app_config for select using (auth.uid() is not null);
create policy admin_config_all on public.app_config for all using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin')
) with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'super_admin')
);

create policy audit_admin_select on public.admin_audit_log for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy tournament_authenticated_select on public.tournament_groups for select using (auth.uid() is not null);
create policy teams_authenticated_select on public.teams for select using (auth.uid() is not null);
create policy matches_authenticated_select on public.matches for select using (auth.uid() is not null);
create policy bracket_slots_authenticated_select on public.bracket_slots for select using (auth.uid() is not null);

create policy tickets_owner_select on public.tickets for select using (claimed_by_user_id = auth.uid());
create policy tickets_admin_select on public.tickets for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy prediction_owner_select on public.prediction_headers for select using (user_id = auth.uid());
create policy prediction_owner_update on public.prediction_headers for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy prediction_admin_select on public.prediction_headers for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy prediction_scores_owner_select on public.prediction_match_scores for select using (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
);
create policy prediction_scores_owner_write on public.prediction_match_scores for all using (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
) with check (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
);
create policy prediction_scores_admin_select on public.prediction_match_scores for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy standings_owner_select on public.predicted_group_standings for select using (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy bracket_owner_select on public.predicted_bracket_slots for select using (
    exists (select 1 from public.prediction_headers h where h.id = prediction_id and h.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy actual_authenticated_select on public.actual_group_standings for select using (auth.uid() is not null);
create policy actual_bracket_authenticated_select on public.actual_bracket_slots for select using (auth.uid() is not null);

create policy scores_owner_select on public.ticket_scores for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.claimed_by_user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);

create policy scores_details_owner_select on public.score_details for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.claimed_by_user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin_tthh', 'super_admin'))
);
