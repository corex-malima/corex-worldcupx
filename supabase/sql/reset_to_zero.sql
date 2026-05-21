-- reset_to_zero.sql
-- DESTRUCTIVO: limpia TODO rastro de tickets, predicciones, scoring y
-- colaboradores de prueba. Deja la BD lista para arrancar producción
-- desde cero — solo conserva fixture del Mundial, configuración y los
-- 2 admins reservados (0000000001 super_admin, 0000000002 admin_tthh).
--
-- USAR SOLO ANTES DE LANZAR EN PRODUCCIÓN. NO ejecutar después de que
-- colaboradores reales empiecen a registrarse.
--
-- LO QUE LIMPIA:
--   - score_details
--   - ticket_scores
--   - predicted_group_standings + predicted_bracket_slots
--   - prediction_match_scores
--   - prediction_third_place_assignments
--   - prediction_headers
--   - tickets (TODOS, incluyendo cancelled)
--   - profiles que NO sean de admin reservado
--   - auth.users que NO sean de admin reservado
--   - admin_audit_log (eventos de prueba — opcional, comentar si quieres conservarlos)
--
-- LO QUE NO TOCA:
--   - employees (catálogo HR real de Malima)
--   - teams, matches, tournament_groups, r32_third_place_rules (fixture Mundial)
--   - app_config (deadline, scoring_rules, app_settings)
--   - profiles + auth.users de admins reservados (0000000001, 0000000002)
--   - Resultados oficiales — si quedaron sucios, correr reset_actual_results.sql
--     primero (o después, da igual: son tablas diferentes).

-- ============================================================================
-- 0) DIAGNÓSTICO INICIAL
-- ============================================================================
do $$
declare
    v_tickets int;
    v_profiles int;
    v_predictions int;
    v_authusers int;
    v_admins int;
begin
    select count(*) into v_tickets from public.tickets;
    select count(*) into v_profiles from public.profiles;
    select count(*) into v_predictions from public.prediction_headers;
    select count(*) into v_authusers from auth.users;
    select count(*) into v_admins from public.profiles where role in ('super_admin', 'admin_tthh');
    raise notice 'ANTES → tickets: % | profiles: % (% admins) | predictions: % | auth.users: %',
        v_tickets, v_profiles, v_admins, v_predictions, v_authusers;
end$$;

-- ============================================================================
-- 1) BORRAR SCORING DERIVADO (depende de tickets)
-- ============================================================================
delete from public.score_details where true;
delete from public.ticket_scores where true;
delete from public.predicted_group_standings where true;

do $$
begin
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name='predicted_bracket_slots') then
        execute 'delete from public.predicted_bracket_slots where true';
    end if;
end$$;

-- ============================================================================
-- 2) BORRAR PREDICCIONES (dependen de prediction_headers)
-- ============================================================================
delete from public.prediction_match_scores where true;
delete from public.prediction_third_place_assignments where true;
delete from public.prediction_headers where true;

-- ============================================================================
-- 3) BORRAR TICKETS
-- ============================================================================
delete from public.tickets where true;

-- ============================================================================
-- 4) BORRAR PROFILES NO-ADMIN
-- ============================================================================
-- Identificar admins reservados por cédula (admin maestro + admin_tthh)
delete from public.profiles
where cedula not in ('0000000001', '0000000002')
   or role not in ('super_admin', 'admin_tthh');

-- ============================================================================
-- 5) BORRAR AUTH USERS NO-ADMIN
-- ============================================================================
-- Convención: los admins reservados usan emails @mundial.malima creados desde
-- el seed file 18. Los colaboradores reales usan emails generados a partir
-- de su cédula también con @mundial.malima. Distinguimos por la cédula
-- almacenada en raw_user_meta_data o en el email.
-- Más seguro: borrar todos los auth.users que NO estén ligados a un profile
-- con rol admin.
delete from auth.users
where id not in (
    select user_id from public.profiles
    where role in ('super_admin', 'admin_tthh')
      and cedula in ('0000000001', '0000000002')
);

-- ============================================================================
-- 6) (Opcional) Limpiar audit log
-- ============================================================================
-- Comentar esta línea si quieres conservar la trazabilidad de las pruebas.
delete from public.admin_audit_log where true;

-- ============================================================================
-- 7) VERIFICACIÓN FINAL
-- ============================================================================
do $$
declare
    v_tickets int;
    v_profiles int;
    v_predictions int;
    v_authusers int;
    v_admins int;
    v_match_scores int;
    v_third_assigns int;
    v_ticket_scores int;
    v_score_details int;
begin
    select count(*) into v_tickets from public.tickets;
    select count(*) into v_profiles from public.profiles;
    select count(*) into v_predictions from public.prediction_headers;
    select count(*) into v_authusers from auth.users;
    select count(*) into v_admins from public.profiles where role in ('super_admin', 'admin_tthh');
    select count(*) into v_match_scores from public.prediction_match_scores;
    select count(*) into v_third_assigns from public.prediction_third_place_assignments;
    select count(*) into v_ticket_scores from public.ticket_scores;
    select count(*) into v_score_details from public.score_details;

    raise notice 'DESPUÉS → tickets: % | profiles: % (% admins) | predictions: % | match_scores: % | third_assigns: % | ticket_scores: % | score_details: % | auth.users: %',
        v_tickets, v_profiles, v_admins, v_predictions, v_match_scores, v_third_assigns, v_ticket_scores, v_score_details, v_authusers;

    if v_tickets = 0 and v_predictions = 0 and v_match_scores = 0 and v_third_assigns = 0
       and v_ticket_scores = 0 and v_score_details = 0
       and v_profiles = v_admins and v_admins = 2
       and v_authusers = 2 then
        raise notice '✓ RESET A CERO COMPLETO. BD lista para producción. Solo quedan los 2 admins reservados.';
    else
        raise warning '⚠ Reset incompleto. Revisar conteos arriba.';
    end if;
end$$;

-- ============================================================================
-- 8) Verificar fixture intacto
-- ============================================================================
select 'fixture_intacto' as tipo,
       (select count(*) from public.teams) as teams,
       (select count(*) from public.tournament_groups) as groups,
       (select count(*) from public.matches where stage='GROUP') as group_matches,
       (select count(*) from public.matches where stage<>'GROUP') as knockout_matches,
       (select count(*) from public.r32_third_place_rules) as r32_rules,
       (select count(*) from public.employees) as employees,
       (select count(*) from public.app_config) as app_config;
