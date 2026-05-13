-- 99_reset_dev.sql
-- PELIGRO: script destructivo solo para desarrollo.
-- No ejecutar en producción.

-- Para usarlo, descomentar el bloque siguiente.
/*
drop view if exists public.v_my_tickets;
drop view if exists public.v_ticket_score_breakdown;
drop view if exists public.v_ranking_by_area;
drop view if exists public.v_ranking_public;

drop function if exists public.recalculate_all_scores();
drop function if exists public.recalculate_ticket_score(uuid);
drop function if exists public.score_advancement(uuid);
drop function if exists public.score_bracket_crosses(uuid);
drop function if exists public.score_group_positions(uuid);
drop function if exists public.score_match(int,int,int,int);
drop function if exists public.build_actual_bracket();
drop function if exists public.recalculate_actual_group_standings();
drop function if exists public.save_actual_result(uuid,int,int,uuid);
drop function if exists public.build_predicted_bracket(uuid);
drop function if exists public.build_predicted_group_standings(uuid);
drop function if exists public.lock_predictions();
drop function if exists public.submit_prediction(uuid);
drop function if exists public.save_prediction_match_score(uuid,uuid,int,int,uuid);
drop function if exists public.validate_deadline();
drop function if exists public.cancel_ticket(uuid,text);
drop function if exists public.claim_ticket(text);
drop function if exists public.sell_ticket(text,numeric);
drop function if exists public.generate_ticket_code();
drop function if exists public.complete_registration_with_ticket(text,text);
drop function if exists public.resolve_auth_email_by_cedula(text);
drop function if exists public.validate_registration_ticket(text,text);
drop function if exists public.technical_email_for_employee(text,text);
drop function if exists public.register_profile_by_cedula(text);
drop function if exists public.validate_active_employee(text);
drop function if exists public.current_profile();
drop function if exists public.is_admin();

drop table if exists public.score_details cascade;
drop table if exists public.ticket_scores cascade;
drop table if exists public.actual_bracket_slots cascade;
drop table if exists public.actual_group_standings cascade;
drop table if exists public.predicted_bracket_slots cascade;
drop table if exists public.predicted_group_standings cascade;
drop table if exists public.prediction_match_scores cascade;
drop table if exists public.prediction_headers cascade;
drop table if exists public.tickets cascade;
drop table if exists public.bracket_slots cascade;
drop table if exists public.matches cascade;
drop table if exists public.teams cascade;
drop table if exists public.tournament_groups cascade;
drop table if exists public.admin_audit_log cascade;
drop table if exists public.app_config cascade;
drop table if exists public.profiles cascade;
drop table if exists public.employees cascade;
*/
