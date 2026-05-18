-- verify_install.sql
-- Audit completo post-instalación. Corre esto DESPUÉS de ejecutar 00→18.
-- Devuelve UNA tabla unificada con todos los checks y el veredicto ✓/✗.
-- No modifica nada (solo lecturas).

drop table if exists tmp_verify;
create temp table tmp_verify (
    seq int generated always as identity,
    seccion text,
    check_name text,
    esperado text,
    actual text,
    detail text
);

-- =================================================================
-- A. EXTENSIONS
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual)
select 'A. EXTENSIONS', 'pgcrypto presente', 'true',
       (select case when count(*) > 0 then 'true' else 'false' end
        from pg_extension where extname='pgcrypto');

-- =================================================================
-- B. TABLAS CORE
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual, detail)
select 'B. TABLAS', 'tablas core presentes', '18',
       (select count(*)::text from information_schema.tables
        where table_schema='public' and table_name in (
          'employees','profiles','tickets','prediction_headers','prediction_match_scores',
          'prediction_third_place_assignments','predicted_group_standings','predicted_bracket_slots',
          'actual_group_standings','actual_bracket_slots','matches','teams','tournament_groups',
          'r32_third_place_rules','app_config','admin_audit_log','score_details','ticket_scores'
        )),
       null;

-- =================================================================
-- C. VIEWS
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual)
select 'C. VIEWS', 'views públicas (4)', '4',
       (select count(*)::text from pg_views
        where schemaname='public' and viewname in (
          'v_ranking_public','v_my_tickets','v_admin_tickets','v_employee_ticket_stats'
        ));

-- =================================================================
-- D. FUNCIONES CRÍTICAS (RPCs)
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'submit_complete_prediction',
       'p_ticket_id uuid, p_payload jsonb',
       coalesce((select pg_get_function_identity_arguments(oid)
        from pg_proc where proname='submit_complete_prediction' and pronamespace='public'::regnamespace), 'AUSENTE');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'save_actual_result',
       'p_match_id uuid, p_home_score integer, p_away_score integer, p_penalty_winner_team_id uuid',
       coalesce((select pg_get_function_identity_arguments(oid)
        from pg_proc where proname='save_actual_result' and pronamespace='public'::regnamespace), 'AUSENTE');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'recalculate_ticket_score',
       'p_ticket_id uuid',
       coalesce((select pg_get_function_identity_arguments(oid)
        from pg_proc where proname='recalculate_ticket_score' and pronamespace='public'::regnamespace), 'AUSENTE');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'recalculate_all_scores', '',
       coalesce((select pg_get_function_identity_arguments(oid)
        from pg_proc where proname='recalculate_all_scores' and pronamespace='public'::regnamespace), 'AUSENTE');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'resolve_actual_knockout_teams', '',
       coalesce((select pg_get_function_identity_arguments(oid)
        from pg_proc where proname='resolve_actual_knockout_teams' and pronamespace='public'::regnamespace), 'AUSENTE');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'match_best_thirds_to_r32 (fix unicidad 3°s)', 'p_best_thirds text[]',
       coalesce((select pg_get_function_identity_arguments(oid)
        from pg_proc where proname='match_best_thirds_to_r32' and pronamespace='public'::regnamespace), 'AUSENTE');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'sell_ticket (2 sobrecargas)', '2',
       (select count(*)::text from pg_proc
        where proname='sell_ticket' and pronamespace='public'::regnamespace);

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'claim_ticket (1 sobrecarga)', '1',
       (select count(*)::text from pg_proc
        where proname='claim_ticket' and pronamespace='public'::regnamespace);

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'D. RPCs', 'can_edit_prediction', '1',
       (select count(*)::text from pg_proc
        where proname='can_edit_prediction' and pronamespace='public'::regnamespace);

-- =================================================================
-- E. FIXTURE DEL TORNEO
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual)
select 'E. FIXTURE', 'grupos A-L (12)', '12',
       (select count(*)::text from public.tournament_groups);

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'E. FIXTURE', 'equipos (48)', '48',
       (select count(*)::text from public.teams);

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'E. FIXTURE', 'partidos GROUP (72)', '72',
       (select count(*)::text from public.matches where stage='GROUP');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'E. FIXTURE', 'partidos KO (32)', '32',
       (select count(*)::text from public.matches where stage<>'GROUP');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'E. FIXTURE', 'r32_third_place_rules (8)', '8',
       (select count(*)::text from public.r32_third_place_rules);

insert into tmp_verify (seccion, check_name, esperado, actual, detail)
select 'E. FIXTURE', '4 equipos por grupo (12 × 4 = 48)', '12',
       (select count(*)::text from (
          select group_code from public.teams where group_code is not null
          group by group_code having count(*) = 4
        ) x),
       (select string_agg(group_code||':'||cnt::text, ', ' order by group_code)
        from (select group_code, count(*) as cnt from public.teams
              where group_code is not null
              group by group_code) y);

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'E. FIXTURE', '6 partidos por grupo (12 × 6 = 72)', '12',
       (select count(*)::text from (
          select group_code from public.matches where stage='GROUP'
          group by group_code having count(*) = 6
        ) x);

-- =================================================================
-- F. RLS
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual, detail)
select 'F. RLS', 'tablas sensibles con rowsecurity (9)', '9',
       (select count(*)::text from pg_tables
        where schemaname='public' and rowsecurity = true
          and tablename in (
            'profiles','employees','tickets','prediction_headers',
            'prediction_match_scores','prediction_third_place_assignments',
            'admin_audit_log','score_details','ticket_scores'
          )),
       null;

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'F. RLS', 'policies admin_select con is_admin()', '>=4',
       (select count(*)::text from pg_policies
        where schemaname='public' and policyname like '%admin_select'
          and qual like '%is_admin%');

-- =================================================================
-- G. ADMIN ACCOUNTS (seed)
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual, detail)
select 'G. ADMIN', 'super_admin existe', '1',
       (select count(*)::text from public.profiles where role='super_admin' and cedula='0000000001'),
       'cedula 0000000001 / WorldCupX2026!';

insert into tmp_verify (seccion, check_name, esperado, actual, detail)
select 'G. ADMIN', 'admin_tthh existe', '1',
       (select count(*)::text from public.profiles where role='admin_tthh' and cedula='0000000002'),
       'cedula 0000000002 / TTHH2026!';

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'G. ADMIN', 'auth.users con email @mundial.malima sincronizados con profiles', '0 huérfanos',
       (select count(*)::text from auth.users u
        where u.email like '%@mundial.malima'
          and not exists (select 1 from public.profiles p where p.user_id=u.id));

-- =================================================================
-- H. CONFIG
-- =================================================================
insert into tmp_verify (seccion, check_name, esperado, actual)
select 'H. CONFIG', 'app_config con prediction_deadline', '>=1',
       (select count(*)::text from public.app_config where key='prediction_deadline');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'H. CONFIG', 'app_config con scoring_rules', '>=1',
       (select count(*)::text from public.app_config where key='scoring_rules');

insert into tmp_verify (seccion, check_name, esperado, actual)
select 'H. CONFIG', 'app_config con app_settings', '>=1',
       (select count(*)::text from public.app_config where key='app_settings');

-- =================================================================
-- OUTPUT FINAL
-- =================================================================
select seq, seccion, check_name, esperado, actual,
       case
         when esperado is null or actual is null then '—'
         when esperado = actual then '✓ OK'
         when esperado like '>=%' and actual ~ '^[0-9]+$'
              and actual::int >= regexp_replace(esperado, '[^0-9]', '', 'g')::int then '✓ OK'
         when actual like 'AUSENTE' then '✗ FAIL — falta función'
         else '✗ FAIL'
       end as veredicto,
       detail
from tmp_verify
order by seq;
