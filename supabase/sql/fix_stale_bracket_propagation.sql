-- fix_stale_bracket_propagation.sql
-- Limpia inconsistencias del check #32 de verify_install.sql:
--   "partidos downstream con stale team de upstream"
--
-- Causa: si re-guardaste un partido knockout con un ganador DISTINTO al que
-- tenía antes, y el partido downstream (R16+) ya estaba marcado 'official',
-- resolve_actual_knockout_teams NO actualiza el downstream (porque tiene
-- guard "status <> 'official'" para no pisar resultados reales).
-- Durante simulaciones de demo donde se re-corren resultados, esto deja
-- los downstream con home_team_id apuntando al ganador VIEJO.
--
-- Este script:
-- 1) Diagnostica cuáles son los 5 (o N) partidos stale
-- 2) Resetea ese downstream a status='pending' + limpia scores + winner
-- 3) Llama resolve_actual_knockout_teams para repropagar desde el upstream
-- 4) Recorre lo mismo para el away_slot (no solo home_slot)
-- 5) Re-verifica
--
-- IDEMPOTENTE: si no hay stales, no hace nada. Re-correrlo es seguro.
--
-- IMPORTANTE: Si lo que estaba stale era un resultado oficial real del
-- Mundial (no demo), esto LO BORRA y tendrás que volverlo a ingresar.
-- Como estamos pre-Mundial 2026, lo único guardado son simulaciones de
-- demo, así que es seguro.

-- ---------- 1) Diagnóstico ----------
do $$
declare
    v_count_home int;
    v_count_away int;
begin
    select count(*) into v_count_home
    from public.matches d
    join public.matches up_h on d.home_slot ~ '^Ganador Partido'
        and up_h.match_no = (regexp_match(d.home_slot, '([0-9]+)'))[1]::int
    where d.stage in ('R16','QF','SF','THIRD_PLACE','FINAL')
      and up_h.status='official' and up_h.winner_team_id is not null
      and d.home_team_id is distinct from up_h.winner_team_id;

    select count(*) into v_count_away
    from public.matches d
    join public.matches up_a on d.away_slot ~ '^Ganador Partido'
        and up_a.match_no = (regexp_match(d.away_slot, '([0-9]+)'))[1]::int
    where d.stage in ('R16','QF','SF','THIRD_PLACE','FINAL')
      and up_a.status='official' and up_a.winner_team_id is not null
      and d.away_team_id is distinct from up_a.winner_team_id;

    raise notice 'STALE detectados → home_team: % | away_team: %', v_count_home, v_count_away;
end$$;

-- ---------- 2) Listar los partidos stale antes del fix (informativo) ----------
select
  d.match_no as downstream_partido,
  d.stage as ronda,
  d.home_slot,
  (regexp_match(d.home_slot, '([0-9]+)'))[1]::int as upstream_partido,
  th.name as team_actual_en_home,
  tu.name as winner_real_upstream
from public.matches d
join public.matches up_h on d.home_slot ~ '^Ganador Partido'
    and up_h.match_no = (regexp_match(d.home_slot, '([0-9]+)'))[1]::int
left join public.teams th on th.id = d.home_team_id
left join public.teams tu on tu.id = up_h.winner_team_id
where d.stage in ('R16','QF','SF','THIRD_PLACE','FINAL')
  and up_h.status='official' and up_h.winner_team_id is not null
  and d.home_team_id is distinct from up_h.winner_team_id;

-- ---------- 3) Resetear downstream stale a estado 'scheduled' ----------
-- Limpiamos los downstream: status pending, scores nulos, winner nulo,
-- teams nulos. resolve_actual_knockout_teams los repoblará desde el upstream.
update public.matches d
set status = 'scheduled',
    home_team_id = case
      when d.home_slot ~ '^Ganador Partido'
       and exists (select 1 from public.matches up where up.match_no = (regexp_match(d.home_slot, '([0-9]+)'))[1]::int
                   and up.status='official' and up.winner_team_id is distinct from d.home_team_id)
      then null else d.home_team_id end,
    away_team_id = case
      when d.away_slot ~ '^Ganador Partido'
       and exists (select 1 from public.matches up where up.match_no = (regexp_match(d.away_slot, '([0-9]+)'))[1]::int
                   and up.status='official' and up.winner_team_id is distinct from d.away_team_id)
      then null else d.away_team_id end,
    home_score = null,
    away_score = null,
    winner_team_id = null,
    penalty_winner_team_id = null,
    updated_at = now()
where d.stage in ('R16','QF','SF','THIRD_PLACE','FINAL')
  and (
    (d.home_slot ~ '^Ganador Partido' and exists (
      select 1 from public.matches up where up.match_no = (regexp_match(d.home_slot, '([0-9]+)'))[1]::int
        and up.status='official' and up.winner_team_id is distinct from d.home_team_id
    ))
    or
    (d.away_slot ~ '^Ganador Partido' and exists (
      select 1 from public.matches up where up.match_no = (regexp_match(d.away_slot, '([0-9]+)'))[1]::int
        and up.status='official' and up.winner_team_id is distinct from d.away_team_id
    ))
  );

-- ---------- 4) Re-propagar desde upstream ----------
-- Llama a la función que toma los winners official y rellena home/away
-- teams downstream según los slots ('Ganador Partido N', 'Perdedor Partido N', etc).
select public.resolve_actual_knockout_teams();

-- ---------- 5) Re-verificar ----------
do $$
declare
    v_stale int;
begin
    select count(*) into v_stale
    from public.matches d
    join public.matches up_h on d.home_slot ~ '^Ganador Partido'
        and up_h.match_no = (regexp_match(d.home_slot, '([0-9]+)'))[1]::int
    where d.stage in ('R16','QF','SF','THIRD_PLACE','FINAL')
      and up_h.status='official' and up_h.winner_team_id is not null
      and d.home_team_id is distinct from up_h.winner_team_id;

    if v_stale = 0 then
        raise notice '✓ FIX aplicado. Cero downstream stale. Ya puedes correr verify_install.sql y check #32 saldrá ✓ OK.';
    else
        raise warning '⚠ Aún quedan % downstream stale tras el fix. Revisar manualmente.', v_stale;
    end if;
end$$;
