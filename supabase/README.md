# Supabase - Polla Mundialista

Esta carpeta contiene SQL ejecutable, seeds, plantillas CSV y documentación operativa para montar el backend de la Polla Mundialista.

## Orden de ejecución (instalación fresca v0.1.5)

Ejecutar en Supabase SQL Editor, **en este orden**. Cada archivo es idempotente — se puede ejecutar dos veces sin errores.

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `sql/00_extensions.sql` | Extensiones pgcrypto, uuid |
| 2 | `sql/01_schema_core.sql` | employees, profiles, app_config, admin_audit_log |
| 3 | `sql/02_schema_tournament.sql` | tournament_groups, teams, matches |
| 4 | `sql/03_schema_predictions.sql` | prediction_headers, prediction_match_scores, prediction_third_place_assignments |
| 5 | `sql/04_indexes_constraints.sql` | Índices y constraints |
| 6 | `sql/05_rls_policies.sql` | Row-level security |
| 7 | `sql/06_functions_auth_profiles.sql` | is_admin, current_profile, resolve_auth_email_by_cedula |
| 8 | `sql/07_functions_tickets.sql` | sell_ticket, claim_ticket, cancel_ticket |
| 9 | `sql/08_functions_predictions.sql` | submit_complete_prediction, save_prediction_match_score |
| 10 | `sql/09_functions_actual_results.sql` | save_actual_result + resolve bracket (con fix propagación + unicidad 3°s) |
| 11 | `sql/10_functions_scoring.sql` | recalculate_ticket_score (con cruce flexible) |
| 12 | `sql/11_views_rankings.sql` | v_ranking_public, v_my_tickets |
| 13 | `sql/12_seed_config.sql` | Config inicial (deadline) |
| 14 | `sql/13_seed_demo_worldcup.sql` | **48 equipos + 104 partidos + 8 reglas mejores 3°s** |
| 15 | `sql/14_real_person_profile_integration.sql` | sell_ticket overload con datos de personal |
| 16 | `sql/15_resync_v0_1_1.sql` | Catch-up para BDs viejas (idempotente en frescas) |
| 17 | `sql/16_v0_1_2_admin_edit_and_autosave.sql` | can_edit_prediction + auto-save granular |
| 18 | `sql/17_v0_1_3_admin_search_and_filters.sql` | v_admin_tickets + v_ranking_public con clasificación |
| 19 | **`sql/18_seed_admin_accounts.sql`** | **Crea admin maestro + admin TTHH** |

Después corre `sql/verify_install.sql` para confirmar que TODO quedó correcto. Debe devolver `✓ OK` en cada fila.

### Reset completo (para development o reinstall)

```text
1. Edita sql/99_reset_dev.sql y descomenta el bloque /* … */
2. Ejecuta sql/99_reset_dev.sql en Supabase SQL Editor
3. Authentication → Users → borra todos los usuarios manualmente
4. Re-ejecuta sql/00 hasta sql/18 en orden
5. Ejecuta sql/verify_install.sql y verifica que todo dé ✓ OK
```

### Cuentas admin creadas por `18_seed_admin_accounts.sql`

| Cédula (login) | Password (cambiar después) | Rol |
|---|---|---|
| `0000000001` | `WorldCupX2026!` | `super_admin` (ADMIN MAESTRO) |
| `0000000002` | `TTHH2026!` | `admin_tthh` (ADMIN TTHH) |

⚠️ **Antes de correr `18_seed_admin_accounts.sql` en producción**, edita las variables `password` adentro del DO block para usar passwords seguras. O cambia las passwords después desde Supabase Dashboard → Authentication → Users.

### Si tu BD ya corrió 00→14 ANTES de v0.1.1

Ejecuta una sola vez `sql/15_resync_v0_1_1.sql`. Es un catch-up idempotente que pone al día:

- Tabla `prediction_third_place_assignments` + columna `prediction_headers.third_place_team_id`.
- RLS para la nueva tabla + reemplazo de políticas admin con `is_admin()`.
- `resolve_auth_email_by_cedula` robusto (lee email real de `auth.users`).
- `submit_complete_prediction(uuid, jsonb)` (RPC de submit atómico).
- `save_prediction_match_score` con args `p_home_team_id`/`p_away_team_id`.
- `resolve_actual_knockout_teams`, `resolve_slot_to_team`, `build_actual_bracket`.
- Scoring completo: `score_bracket_crosses`, `score_advancement`, `score_champion_bonus`, `score_third_place_bonus`, `recalculate_ticket_score`.
- Limpia `claim_ticket(2 args)` que rompía el contrato.
- Views nuevas: alias amigable `Ticket N` por colaborador (`v_ranking_public.alias`, `v_my_tickets.codeMasked`) y `v_employee_ticket_stats` (vendidos/reclamados/pendientes por employee, usado por `SellTicketPanel`).

Validación post-ejecución:

```sql
select pg_get_function_identity_arguments(p.oid)
from pg_proc p
where p.proname = 'submit_complete_prediction' and p.pronamespace = 'public'::regnamespace;
-- debe retornar: p_ticket_id uuid, p_payload jsonb

select * from public.v_employee_ticket_stats limit 1;
-- la view debe existir y devolver datos si hay tickets vendidos
```

## Datos clave que cargan los seeds

- `13_seed_demo_worldcup.sql` crea **48 selecciones**, **12 grupos (A–L)** y los **104 partidos** del Mundial 2026 (72 de grupos + 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3.º puesto + 1 Final). También crea la tabla `r32_third_place_rules` con la matriz oficial de mejores terceros para los 8 cruces R32 que la usan (partidos 74, 77, 79, 80, 81, 82, 85, 87).
- Los partidos de eliminatorias se crean con `home_slot`/`away_slot` textuales (p. ej. `'1E'`, `'3A/B/C/D/F'`, `'Ganador Partido 73'`, `'Perdedor Partido 101'`). La RPC `resolve_actual_knockout_teams()` los resuelve a `home_team_id`/`away_team_id` automáticamente conforme se cargan los resultados oficiales.
- Las sedes y horarios son aproximados; sustituirlos cuando la FIFA publique los oficiales.

## Submit atómico de predicción

La app envía la predicción completa en un único `jsonb`:

```sql
select public.submit_complete_prediction(
  '00000000-0000-0000-0000-000000000000'::uuid,
  jsonb_build_object(
    'group_scores',            jsonb_build_array(),
    'third_place_assignments', jsonb_build_array(),
    'knockout_matches',        jsonb_build_array(),
    'champion_team_id',        null,
    'third_place_team_id',     null
  )
);
```

La función valida deadline + ownership del ticket, limpia drafts previos, inserta marcadores y asignaciones, recalcula standings predichos y materializa el bracket predicho.

## Reglas de puntuación

Tabla oficial implementada en `10_functions_scoring.sql`:

| Concepto | Puntos |
|---|---|
| Marcador exacto (grupo o eliminatoria) | 3 |
| Resultado correcto (1X2) | 1 |
| Posición exacta de equipo en grupo (1.º/2.º/3.º) | 1 por equipo |
| Cruce correcto por ronda (par exacto, sin orden) | 1 |
| Selección que avanza | R32=1, R16=2, QF=3, SF=4 |
| Bono campeón | 10 |
| Bono 3.º puesto | 5 |

Tras cargar un resultado, `recalculate_ticket_score(p_ticket_id)` regenera `score_details` y `ticket_scores`. El total que aparece en `v_ranking_public.points` es la suma de todas las categorías.

## Carga de CSV

Usar Supabase Table Editor o SQL `COPY` según permisos.

Plantillas:

- `csv_templates/employees_template.csv`
- `csv_templates/teams_template.csv`
- `csv_templates/matches_template.csv`

## Registro inicial con ticket

El colaborador primero compra un ticket con TTHH. Luego se registra desde la app con cédula + código de ticket.

RPCs:

```sql
select public.validate_registration_ticket('0102030405', 'ABC123');
select public.complete_registration_with_ticket('0102030405', 'ABC123');
```

- `validate_registration_ticket` se puede llamar antes de autenticar y solo devuelve datos cuando el par cédula + ticket vendido coincide.
- `complete_registration_with_ticket` requiere usuario autenticado por Supabase Auth, crea `profiles`, reclama el ticket y crea `prediction_headers`.
- El email técnico de Auth se genera como `<cedula>.<apellido>@mundial.malima`.
- Para esta app interna, configurar Supabase Auth con confirmación de email desactivada.

## Crear usuarios admin

1. Vender un ticket al colaborador desde TTHH.
2. Registrar el usuario desde la app con cédula + código de ticket.
3. En SQL Editor, asignar rol:

```sql
update public.profiles
set role = 'admin_tthh'
where cedula = '0102030405';
```

Roles válidos:

- `collaborator`
- `admin_tthh`
- `super_admin`

## Probar venta de tickets

Como usuario admin autenticado desde la app:

```sql
select public.sell_ticket('0102030405');
```

La función genera el código en PostgreSQL y reintenta si existe colisión. Para ventas desde la Edge Function de personal real, la app usa la sobrecarga:

```sql
select public.sell_ticket(
  '1000',
  '0107428849',
  'NOMBRE COLABORADOR',
  'MH1',
  'MONJASHUAICO 1',
  'TRABAJADOR OPERATIVO FLORICOLA O DEL AGRO',
  'AGRICOLA'
);
```

Los nuevos códigos usan formato `WCX-XXXXXXXX`. Los códigos legacy de 6 caracteres siguen siendo aceptados por el frontend y las RPCs.

## Integración con personal real

Ver `docs/09-edge-person-profile-integration.md`.

La app consulta exclusivamente la Edge Function `pull-person-profile` mediante Supabase:

```ts
supabase.functions.invoke('pull-person-profile', {
  body: { limit: 1000, offset: 0 }
});
```

No guardar `LOCAL_API_URL`, `LOCAL_API_KEY` ni URLs `trycloudflare.com` en el frontend.

## Probar reclamo de tickets adicionales

Como colaborador autenticado con la misma cédula:

```sql
select public.claim_ticket('ABC123');
```

Valida que el código exista, esté vendido, pertenezca a la cédula del perfil, no esté reclamado y no esté anulado.

## Probar ranking

Después de cargar resultados reales:

```sql
select public.recalculate_all_scores();
select * from public.v_ranking_public order by rank;
```

## Seguridad

- RLS activado en tablas expuestas.
- `service_role` no se usa en frontend.
- RPC críticas validan `auth.uid()` y rol.
- Las vistas públicas enmascaran cédula y código.
- El scoring se recalcula en base de datos, no en React.
