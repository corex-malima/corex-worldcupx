# Supabase - Polla Mundialista

Esta carpeta contiene SQL ejecutable, seeds, plantillas CSV y documentación operativa para montar el backend de la Polla Mundialista.

## Orden de ejecución

Ejecutar en Supabase SQL Editor, en este orden:

1. `sql/00_extensions.sql`
2. `sql/01_schema_core.sql`
3. `sql/02_schema_tournament.sql`
4. `sql/03_schema_predictions.sql`
5. `sql/04_indexes_constraints.sql`
6. `sql/05_rls_policies.sql`
7. `sql/06_functions_auth_profiles.sql`
8. `sql/07_functions_tickets.sql`
9. `sql/08_functions_predictions.sql`
10. `sql/09_functions_actual_results.sql`
11. `sql/10_functions_scoring.sql`
12. `sql/11_views_rankings.sql`
13. `sql/12_seed_config.sql`
14. `sql/13_seed_demo_worldcup.sql`
15. `sql/14_real_person_profile_integration.sql`

`sql/99_reset_dev.sql` es destructivo y solo debe usarse en desarrollo.

Cada archivo es idempotente: se puede ejecutar dos veces seguidas sin errores (usa `if not exists` / `on conflict` / `create or replace`). Para reset completo: ejecutar `99_reset_dev.sql` y volver a correr `00 → 14`.

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
