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

`sql/99_reset_dev.sql` es destructivo y solo debe usarse en desarrollo.

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

La función genera el código en PostgreSQL y reintenta si existe colisión.

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
