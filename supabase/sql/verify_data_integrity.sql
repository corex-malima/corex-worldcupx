-- verify_data_integrity.sql
-- Health check de datos post-demo. Solo lecturas.
-- Devuelve una tabla unificada con conteos + checks de integridad para
-- validar que las simulaciones no rompieron nada a nivel de relaciones,
-- constraints o lógica de negocio.
--
-- Uso: pega todo en Supabase SQL Editor y corre. Mira la columna `verdict`.
-- ✓ = OK · ⚠ = revisar · ✗ = problema (investigar).

drop table if exists tmp_health;
create temp table tmp_health (
    seq int generated always as identity,
    seccion text,
    check_name text,
    esperado text,
    actual text,
    verdict text,
    detail text
);

-- =============================================================================
-- A. INVENTARIO BÁSICO
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'A. INVENTARIO', 'Profiles registrados', '>0',
       (select count(*)::text from public.profiles),
       case when (select count(*) from public.profiles) > 0 then '✓' else '⚠' end;

insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'A. INVENTARIO', 'Tickets activos (no cancelled)', '>0',
       (select count(*)::text from public.tickets where status <> 'cancelled'),
       case when (select count(*) from public.tickets where status <> 'cancelled') > 0 then '✓' else '⚠' end;

insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'A. INVENTARIO', 'Tickets reclamados', '>=0',
       (select count(*)::text from public.tickets where status = 'claimed'),
       '✓';

insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'A. INVENTARIO', 'Tickets vendidos sin reclamar', '>=0',
       (select count(*)::text from public.tickets where status = 'sold'),
       '✓';

insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'A. INVENTARIO', 'Predicciones enviadas', '>=0',
       (select count(*)::text from public.prediction_headers where status = 'submitted'),
       '✓';

-- =============================================================================
-- B. INTEGRIDAD REFERENCIAL (FKs)
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'B. FKs', 'Tickets huérfanos sin employee', '0',
       count(*)::text,
       case when count(*) = 0 then '✓' else '✗' end,
       case when count(*) > 0 then 'IDs: ' || string_agg(t.id::text, ', ') else null end
from public.tickets t
left join public.employees e on e.id = t.employee_id
where e.id is null;

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'B. FKs', 'Prediction headers sin ticket', '0',
       count(*)::text,
       case when count(*) = 0 then '✓' else '✗' end,
       case when count(*) > 0 then string_agg(p.id::text, ', ') else null end
from public.prediction_headers p
left join public.tickets t on t.id = p.ticket_id
where t.id is null;

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'B. FKs', 'Match scores sin prediction header', '0',
       count(*)::text,
       case when count(*) = 0 then '✓' else '✗' end,
       case when count(*) > 0 then string_agg(s.match_id::text, ', ') else null end
from public.prediction_match_scores s
left join public.prediction_headers h on h.id = s.prediction_id
where h.id is null;

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'B. FKs', 'Third place assignments sin prediction', '0',
       count(*)::text,
       case when count(*) = 0 then '✓' else '✗' end,
       null
from public.prediction_third_place_assignments a
left join public.prediction_headers h on h.id = a.prediction_id
where h.id is null;

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'B. FKs', 'Scores apuntan a teams que existen', '0 inválidos',
       count(*)::text,
       case when count(*) = 0 then '✓' else '✗' end,
       null
from public.prediction_match_scores s
left join public.teams th on th.id = s.home_team_id
left join public.teams ta on ta.id = s.away_team_id
where (s.home_team_id is not null and th.id is null)
   or (s.away_team_id is not null and ta.id is null);

-- =============================================================================
-- C. LÓGICA DE PREDICCIONES
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'C. LÓGICA', 'Tickets claimed con auth user', '100%',
       count(*) filter (where claimed_by_user_id is not null)::text || ' / ' || count(*)::text,
       case when count(*) = count(*) filter (where claimed_by_user_id is not null) then '✓' else '✗' end,
       case when count(*) - count(*) filter (where claimed_by_user_id is not null) > 0
            then 'tickets claimed sin claimed_by_user_id' else null end
from public.tickets
where status = 'claimed';

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'C. LÓGICA', 'Predicciones submitted con champion', '100%',
       count(*) filter (where champion_team_id is not null)::text || ' / ' || count(*)::text,
       case when count(*) = 0 or count(*) = count(*) filter (where champion_team_id is not null) then '✓' else '⚠' end,
       case when count(*) - count(*) filter (where champion_team_id is not null) > 0
            then 'predicciones submitted sin campeón' else null end
from public.prediction_headers
where status = 'submitted';

-- Cada predicción submitted debería tener 72 marcadores de grupos
insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'C. LÓGICA', 'Predicciones submitted con 72 group scores', 'todas',
       (select count(*)::text from public.prediction_headers ph
        where ph.status='submitted'
          and (select count(*) from public.prediction_match_scores s where s.prediction_id=ph.id and s.stage='GROUP') = 72),
       case when (select count(*) from public.prediction_headers where status='submitted') =
                 (select count(*) from public.prediction_headers ph
                  where ph.status='submitted'
                    and (select count(*) from public.prediction_match_scores s where s.prediction_id=ph.id and s.stage='GROUP') = 72)
            then '✓' else '⚠' end,
       'Algunas predicciones submitted no tienen 72 grupos. Revisa headers incompletos.';

-- Predicciones con bracket parcial (R32 lleno pero R16+ vacío)
insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'C. LÓGICA', 'Predicciones submitted sin Final', '0',
       count(*)::text,
       case when count(*) = 0 then '✓' else '⚠' end,
       case when count(*) > 0 then 'Predicciones submitted sin marcador en partido 104 (Final). Revisar autofill o envíos incompletos.' else null end
from public.prediction_headers ph
where ph.status = 'submitted'
  and not exists (
    select 1 from public.prediction_match_scores s
    join public.matches m on m.id = s.match_id
    where s.prediction_id = ph.id and m.match_no = 104
  );

-- =============================================================================
-- D. RESULTADOS OFICIALES Y SCORING
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'D. SCORING', 'Partidos con resultado oficial', '>=0',
       (select count(*)::text from public.matches where status='official'),
       '✓';

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'D. SCORING', 'Ticket_scores coherentes (no negativos)', '0 negativos',
       count(*)::text,
       case when count(*) = 0 then '✓' else '✗' end,
       null
from public.ticket_scores
where total_points < 0
   or coalesce(exact_count, 0) < 0
   or coalesce(result_count, 0) < 0;

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'D. SCORING', 'Score_details apuntan a tickets vigentes', '100%',
       count(*) filter (where t.id is not null)::text || ' / ' || count(*)::text,
       case when count(*) = count(*) filter (where t.id is not null) then '✓' else '✗' end,
       case when count(*) > count(*) filter (where t.id is not null)
            then 'score_details con ticket_id huérfano' else null end
from public.score_details sd
left join public.tickets t on t.id = sd.ticket_id;

-- =============================================================================
-- E. CONFIG / DEADLINE
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'E. CONFIG', 'Deadline configurado', '2026-06-10T23:59:59-05:00',
       (select value from public.app_config where key='prediction_deadline' limit 1),
       case when (select value from public.app_config where key='prediction_deadline' limit 1) is not null
            then '✓' else '✗' end;

insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'E. CONFIG', 'Deadline aún no pasó', 'false',
       (select case when public.is_deadline_passed() then 'true' else 'false' end),
       case when public.is_deadline_passed() then '⚠ DEADLINE YA PASÓ' else '✓' end;

-- =============================================================================
-- F. RLS Y POLÍTICAS
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'F. RLS', 'Tablas con RLS habilitado', '>=10',
       count(*)::text,
       case when count(*) >= 10 then '✓' else '⚠' end,
       'Tablas: ' || string_agg(tablename, ', ')
from pg_tables
where schemaname='public' and rowsecurity=true;

insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'F. RLS', 'Políticas activas en tickets', '>=2',
       count(*)::text,
       case when count(*) >= 2 then '✓' else '⚠' end
from pg_policies where schemaname='public' and tablename='tickets';

-- =============================================================================
-- G. ADMIN AUDIT LOG (si hay actividad)
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict)
select 'G. AUDIT', 'Eventos registrados', '>=0',
       (select count(*)::text from public.admin_audit_log),
       '✓';

insert into tmp_health (seccion, check_name, esperado, actual, verdict, detail)
select 'G. AUDIT', 'Cancelaciones con motivo', '100%',
       count(*) filter (where coalesce(reason, '') <> '')::text || ' / ' || count(*)::text,
       case when count(*) = 0 or count(*) = count(*) filter (where coalesce(reason, '') <> '') then '✓' else '⚠' end,
       'Cancelaciones sin motivo registrado'
from public.admin_audit_log
where event_type = 'ticket_cancelled';

-- =============================================================================
-- H. SUMMARY
-- =============================================================================
insert into tmp_health (seccion, check_name, esperado, actual, verdict)
values ('Z. RESUMEN', 'Total checks OK', null, null,
        (select '✓:' || count(*) filter (where verdict='✓') || ' ⚠:' || count(*) filter (where verdict='⚠') || ' ✗:' || count(*) filter (where verdict='✗')
         from tmp_health));

select seq, seccion, verdict, check_name, esperado, actual, detail
from tmp_health
order by seq;
