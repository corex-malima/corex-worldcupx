-- 99_reset_dev.sql
-- PELIGRO: script destructivo solo para desarrollo.
-- No ejecutar en producción.
--
-- Estrategia: dropeamos las TABLAS primero con cascade (eso elimina policies,
-- triggers, índices, vistas dependientes y FKs en una sola pasada), y luego
-- limpiamos funciones y vistas residuales. Así no peleamos con dependencias
-- de policies sobre helpers como is_admin().
--
-- Para usarlo, descomentar el bloque siguiente.
/*
-- 1) Tablas con cascade (elimina policies, FKs, triggers, índices, vistas dependientes)
drop table if exists public.score_details cascade;
drop table if exists public.ticket_scores cascade;
drop table if exists public.actual_bracket_slots cascade;
drop table if exists public.actual_group_standings cascade;
drop table if exists public.predicted_bracket_slots cascade;
drop table if exists public.predicted_group_standings cascade;
drop table if exists public.prediction_third_place_assignments cascade;
drop table if exists public.prediction_match_scores cascade;
drop table if exists public.prediction_headers cascade;
drop table if exists public.tickets cascade;
drop table if exists public.bracket_slots cascade;
drop table if exists public.r32_third_place_rules cascade;
drop table if exists public.matches cascade;
drop table if exists public.teams cascade;
drop table if exists public.tournament_groups cascade;
drop table if exists public.admin_audit_log cascade;
drop table if exists public.app_config cascade;
drop table if exists public.profiles cascade;
drop table if exists public.employees cascade;

-- 2) Vistas residuales (por si alguna no quedó atada a una tabla dropeada)
drop view if exists public.v_my_tickets cascade;
drop view if exists public.v_ticket_score_breakdown cascade;
drop view if exists public.v_ranking_by_area cascade;
drop view if exists public.v_ranking_public cascade;
drop view if exists public.v_admin_tickets cascade;
drop view if exists public.v_admin_system_status cascade;
drop view if exists public.v_employee_ticket_stats cascade;

-- 3) Funciones (ya sin policies que dependan)
drop function if exists public.recalculate_all_scores() cascade;
drop function if exists public.recalculate_ticket_score(uuid) cascade;
drop function if exists public.score_advancement(uuid) cascade;
drop function if exists public.score_bracket_crosses(uuid) cascade;
drop function if exists public.score_group_positions(uuid) cascade;
drop function if exists public.score_champion_bonus(uuid) cascade;
drop function if exists public.score_third_place_bonus(uuid) cascade;
drop function if exists public.score_match(int,int,int,int) cascade;
drop function if exists public.build_actual_bracket() cascade;
drop function if exists public.resolve_actual_knockout_teams() cascade;
drop function if exists public.resolve_slot_to_team(text) cascade;
drop function if exists public.recalculate_actual_group_standings() cascade;
drop function if exists public.save_actual_result(uuid,int,int,uuid) cascade;
drop function if exists public.build_predicted_bracket(uuid) cascade;
drop function if exists public.build_predicted_group_standings(uuid) cascade;
drop function if exists public.lock_predictions() cascade;
drop function if exists public.submit_prediction(uuid) cascade;
drop function if exists public.submit_complete_prediction(uuid, jsonb) cascade;
drop function if exists public.save_prediction_match_score(uuid,uuid,int,int,uuid) cascade;
drop function if exists public.save_prediction_match_score(uuid,uuid,int,int,uuid,uuid,uuid) cascade;
drop function if exists public.validate_deadline() cascade;
drop function if exists public.cancel_ticket(uuid,text) cascade;
drop function if exists public.claim_ticket(text,text) cascade;
drop function if exists public.claim_ticket(text) cascade;
drop function if exists public.sell_ticket(text,text,text,text,text,text,text) cascade;
drop function if exists public.sell_ticket(text,numeric) cascade;
drop function if exists public.sell_ticket(text) cascade;
drop function if exists public.generate_ticket_code() cascade;
drop function if exists public.complete_registration_with_ticket(text,text) cascade;
drop function if exists public.resolve_auth_email_by_cedula(text) cascade;
drop function if exists public.validate_registration_ticket(text,text) cascade;
drop function if exists public.technical_email_for_employee(text,text) cascade;
drop function if exists public.register_profile_by_cedula(text) cascade;
drop function if exists public.validate_active_employee(text) cascade;
drop function if exists public.current_profile() cascade;
drop function if exists public.is_admin() cascade;
*/
