-- reset_actual_results.sql
-- Limpia TODOS los resultados oficiales y datos derivados de scoring.
-- Pensado para borrar el ruido de las simulaciones de demo y dejar la BD
-- en estado pre-Mundial limpio, listo para ingresar resultados reales.
--
-- LO QUE LIMPIA:
--   - matches: status='scheduled', home_score/away_score/winner_team_id/
--     penalty_winner_team_id = null. Para R16+ además home/away_team_id =
--     null (se llenarán por propagación cuando ingreses oficiales).
--     R32 conserva los home/away_team_id que correspondan según el slot
--     fijo (1A, 2B, etc.) o por reseed de actual_group_standings = null.
--   - actual_group_standings: vacía (no hay grupos jugados aún)
--   - actual_bracket_slots: vacía (si existe la tabla)
--   - ticket_scores: vacía (ranking en 0)
--   - score_details: vacía (sin puntos calculados)
--
-- LO QUE NO LIMPIA (intencional — son datos válidos):
--   - tickets, profiles, employees → personas reales registradas
--   - prediction_headers, prediction_match_scores,
--     prediction_third_place_assignments → predicciones que los
--     colaboradores ya enviaron
--   - admin_audit_log → trazabilidad de eventos
--
-- Si ADEMÁS quieres borrar las predicciones de prueba (tickets, profiles,
-- auth.users de simulación), eso es otro script más invasivo — pídelo
-- explícitamente.

-- ========== 1) Diagnóstico inicial ==========
do $$
declare
    v_matches_official int;
    v_standings int;
    v_ticket_scores int;
    v_score_details int;
begin
    select count(*) into v_matches_official from public.matches where status = 'official';
    select count(*) into v_standings from public.actual_group_standings;
    select count(*) into v_ticket_scores from public.ticket_scores;
    select count(*) into v_score_details from public.score_details;
    raise notice 'ANTES → matches official: % | actual_standings: % | ticket_scores: % | score_details: %',
        v_matches_official, v_standings, v_ticket_scores, v_score_details;
end$$;

-- ========== 2) Limpiar scoring derivado primero (depende de matches) ==========
delete from public.score_details where true;
delete from public.ticket_scores where true;

-- ========== 3) Limpiar standings oficiales y bracket slots ==========
delete from public.actual_group_standings where true;

-- actual_bracket_slots existe en algunos esquemas — borrar con tolerancia
do $$
begin
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name='actual_bracket_slots') then
        execute 'delete from public.actual_bracket_slots where true';
    end if;
end$$;

-- ========== 4) Reset de matches a estado fresco ==========
-- Para TODOS los partidos (grupos + KO):
update public.matches
set status = 'scheduled',
    home_score = null,
    away_score = null,
    winner_team_id = null,
    penalty_winner_team_id = null,
    updated_at = now()
where status <> 'scheduled'
   or home_score is not null
   or away_score is not null
   or winner_team_id is not null
   or penalty_winner_team_id is not null;

-- Para R16+ (downstream): además limpiar home/away_team_id porque dependen
-- del upstream que ya nuleamos. Los slots tipo "1A", "2B" no se tocan: esos
-- los maneja resolve_slot_to_team cuando se vuelva a llenar standings.
update public.matches
set home_team_id = null,
    away_team_id = null,
    updated_at = now()
where stage in ('R16','QF','SF','THIRD_PLACE','FINAL');

-- Para R32: también limpiar home/away_team_id ya que apuntaban a equipos
-- determinados por standings inexistentes. Quedará "Ganador 1A vs 2B" etc
-- pero sin team específico hasta que vuelvan a haber standings oficiales.
update public.matches
set home_team_id = null,
    away_team_id = null,
    updated_at = now()
where stage = 'R32';

-- ========== 5) Verificación final ==========
do $$
declare
    v_matches_official int;
    v_standings int;
    v_ticket_scores int;
    v_score_details int;
    v_matches_with_score int;
    v_matches_with_winner int;
begin
    select count(*) into v_matches_official from public.matches where status = 'official';
    select count(*) into v_standings from public.actual_group_standings;
    select count(*) into v_ticket_scores from public.ticket_scores;
    select count(*) into v_score_details from public.score_details;
    select count(*) into v_matches_with_score from public.matches where home_score is not null or away_score is not null;
    select count(*) into v_matches_with_winner from public.matches where winner_team_id is not null;

    raise notice 'DESPUÉS → matches official: % | standings: % | ticket_scores: % | score_details: % | matches con score: % | matches con winner: %',
        v_matches_official, v_standings, v_ticket_scores, v_score_details, v_matches_with_score, v_matches_with_winner;

    if v_matches_official = 0 and v_standings = 0 and v_ticket_scores = 0
       and v_score_details = 0 and v_matches_with_score = 0 and v_matches_with_winner = 0 then
        raise notice '✓ RESET completo. La BD está lista para el Mundial real. Cuando empiecen los partidos, ingresa los resultados desde Admin → Resultados.';
    else
        raise warning '⚠ Aún quedan rastros — revisar manualmente.';
    end if;
end$$;

-- ========== 6) Confirmar predicciones intactas ==========
select 'predicciones_preservadas' as tipo,
       (select count(*) from public.prediction_headers) as headers,
       (select count(*) from public.prediction_match_scores) as match_scores,
       (select count(*) from public.prediction_third_place_assignments) as third_assigns,
       (select count(*) from public.tickets where status <> 'cancelled') as tickets_activos,
       (select count(*) from public.profiles) as profiles;
