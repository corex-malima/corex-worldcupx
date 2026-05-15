# Plan de Cierre — Polla Mundialista (Mundial 2026)

> Plan extenso de auditoría + plan de cierre para dejar la quiniela lista para ejecutar SQL en Supabase y entrar a pruebas. Generado tras auditar `src/`, `supabase/sql/` y el Edge Function `pull-person-profile`.

---

## 0. Contexto

La aplicación ya tiene la UI mock funcionando para los 104 partidos del Mundial 2026 (12 grupos A–L, 16 cruces de R32 con la matriz oficial FIFA, octavos, cuartos, semis, 3.º puesto y final). El esquema SQL existe pero **no está cerrado**: hay TODOs en scoring, el seed de equipos tiene solo 12 selecciones, el bracket en base no contempla mejores terceros y hay un desajuste de firma entre `claim_ticket` cliente y SQL. El Edge Function de personal devuelve campos consistentes con `PersonProfile`, pero no se valida `national_id null` (caso “PERSONAL PRUEBA” con `id=1`).

El objetivo de este plan es:

1. Auditar fin a fin (compra → registro → login → predicción → resultados → ranking).
2. Validar la lógica de la quiniela contra los cruces reales 2026 que envió el usuario.
3. Cerrar los SQL para que sólo haya que correrlos en Supabase en orden y empezar a probar.
4. Documentar el contrato con `pull-person-profile` y los casos límite del personal real.

---

## 1. Hallazgos de la auditoría

### 1.1 Cruces y reglas de la quiniela (UI / mocks)

| Área | Estado | Detalle |
|---|---|---|
| Conteo de partidos | OK | 72 grupo + 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3.º + 1 Final = **104** ([src/data/mock/matches.ts](src/data/mock/matches.ts)) |
| 16 cruces de R32 | OK | Coinciden 1 a 1 con la matriz oficial enviada por el usuario (P73–P88) |
| Octavos→Final | OK | G74×G77, G73×G75, G76×G78, G79×G80, G83×G84, G81×G82, G86×G88, G85×G87, etc. ([src/data/mock/matches.ts:98-114](src/data/mock/matches.ts)) |
| Criterios de desempate de grupo | OK | Puntos → DG → GF → H2H → Fair Play → manual ([src/lib/standings.ts:148-187](src/lib/standings.ts)) |
| Ranking mejores terceros | OK | Top-8 con Puntos → DG → GF → Fair Play → código de grupo ([src/lib/standings.ts:189-202](src/lib/standings.ts)) |
| Asignación de 3.º a slots R32 | OK | Backtracking que respeta `allowedGroupCodes` por cruce ([src/lib/thirdPlaceAssignment.ts](src/lib/thirdPlaceAssignment.ts)) |
| Propagación de bracket | OK | `Ganador/Perdedor Partido N` se resuelve por ronda ([src/lib/bracketBuilder.ts:115-137](src/lib/bracketBuilder.ts)) |
| Reglas de puntos en UI | OK pero **inconsistente con DB** | UI: +3 exacto, +1 resultado, bonos por ronda R32=1/R16=2/QF=3/SF=4, +10 campeón, +5 tercero ([src/lib/scoring.ts](src/lib/scoring.ts)) |

### 1.2 Backend Supabase

| Archivo | Estado | Detalle |
|---|---|---|
| `00_extensions.sql` | OK | pgcrypto |
| `01_schema_core.sql` | OK | `employees`, `profiles`, `app_config`, `admin_audit_log` |
| `02_schema_tournament.sql` | OK | `teams`, `tournament_groups`, `matches` con `home_slot`/`away_slot` textuales |
| `03_schema_predictions.sql` | OK | `prediction_headers`, `prediction_match_scores`, `predicted_group_standings`, `predicted_bracket_slots` |
| `04_indexes_constraints.sql` | OK | índices y unicidad |
| `05_rls_policies.sql` | OK | RLS por rol |
| `06_functions_auth_profiles.sql` | OK | `validate_active_employee`, `validate_registration_ticket`, `resolve_auth_email_by_cedula`, `register_profile_by_cedula`, `technical_email_for_employee` ([supabase/sql/06_functions_auth_profiles.sql](supabase/sql/06_functions_auth_profiles.sql)) |
| `07_functions_tickets.sql` | OK | `complete_registration_with_ticket(p_cedula, p_ticket_code)` y versión vieja de `claim_ticket` |
| `08_functions_predictions.sql` | **PARCIAL** | `save_prediction_match_score`, `submit_prediction`, `lock_predictions`, `build_predicted_group_standings` OK. `build_predicted_bracket` tiene TODO: no inserta R32 oficial ni mejores terceros ([supabase/sql/08_functions_predictions.sql:209-216](supabase/sql/08_functions_predictions.sql)) |
| `09_functions_actual_results.sql` | A verificar | Asumido OK; no auditado en detalle aquí |
| `10_functions_scoring.sql` | **INCOMPLETO** | `score_bracket_crosses` y `score_advancement` devuelven 0, `champion_bonus`/`runner_up_bonus` hardcoded a 0 ([supabase/sql/10_functions_scoring.sql:48-72](supabase/sql/10_functions_scoring.sql), [supabase/sql/10_functions_scoring.sql:144](supabase/sql/10_functions_scoring.sql)) |
| `11_views_rankings.sql` | OK | `v_ranking_public`, `v_my_tickets`, `v_ranking_by_area`, `v_ticket_score_breakdown` |
| `12_seed_config.sql` | A verificar | Config y deadline |
| `13_seed_demo_worldcup.sql` | **INSUFICIENTE** | Solo carga 3 grupos (A,B,C), 12 equipos, 6 partidos de grupo y 2 R32 falsos. **Falta el fixture oficial de 48 equipos / 104 partidos** ([supabase/sql/13_seed_demo_worldcup.sql](supabase/sql/13_seed_demo_worldcup.sql)) |
| `14_real_person_profile_integration.sql` | OK | Agrega columnas (`area_name`, `gender`, `email`, `phone_number`, `job_classification_code`, etc.) a `employees` y `tickets`; nuevo `sell_ticket(7 args)` que `upsert`-ea employee y crea ticket; nuevo `claim_ticket(p_national_id, p_ticket_code)` ([supabase/sql/14_real_person_profile_integration.sql](supabase/sql/14_real_person_profile_integration.sql)) |
| `99_reset_dev.sql` | OK | Para limpiar entorno |

### 1.3 Flujo cliente ↔ SQL

| Punto | Cliente | SQL | Estado |
|---|---|---|---|
| Login con cédula | `signInWithCedula` → `resolve_auth_email_by_cedula` | RPC OK | OK |
| Registro con ticket | `validateRegistrationTicket` + `complete_registration_with_ticket` | RPC OK | OK |
| Vender ticket | `sellTicketForCollaborator` → `sell_ticket(7 args)` | RPC OK (file 14) | OK |
| Activar/reclamar ticket | `supabase.rpc('claim_ticket', { p_code })` ([src/hooks/useTickets.ts:43](src/hooks/useTickets.ts)) | `claim_ticket(p_national_id, p_ticket_code)` (file 14) | **BUG**: la firma cliente y la del SQL no coinciden |
| Guardar score por partido | (no implementado en UI) | `save_prediction_match_score` existe | **GAP** |
| Submit predicción | `usePrediction.submitPrediction` → localStorage únicamente ([src/hooks/usePrediction.ts:141-151](src/hooks/usePrediction.ts)) | `submit_prediction(p_ticket_id)` existe | **GAP** crítico: no llega a Supabase |
| Cargar resultados (admin) | `AdminResultsPage` 100% local ([src/pages/AdminResultsPage.tsx:22-80](src/pages/AdminResultsPage.tsx)) | RPCs reales no se llaman | **GAP** crítico |
| Recalcular ranking | UI hace `setTimeout` 450 ms | `recalculate_all_scores` existe | **GAP** |
| Ranking público | `useRanking` lee `v_ranking_public` | View OK pero bonus_points incluyen columnas que hoy siempre son 0 | Funcional pero parcial |

### 1.4 Integración `pull-person-profile`

Edge Function: `https://olaziejsdzlwhovdtcnl.supabase.co/functions/v1/pull-person-profile`

Respuesta (según captura):
```json
{ "data": [ {
  "person_id": "1",
  "person_name": "PERSONAL PRUEBA",
  "area_id": null,
  "area_name": null,
  "national_id": null,
  "gender": null,
  "job_title": null,
  "associated_worker_name": null,
  "email": null,
  "phone_number": null,
  "job_classification_code": "AGRICOLA"
} , ... ] }
```

- `PersonProfile` ([src/types/personProfile.ts](src/types/personProfile.ts)) **coincide exactamente** con el contrato.
- `personProfileService.fetchAllPersonProfiles` invoca con `body: { limit, offset }` y pagina hasta 20 páginas × 1000.
- **Riesgo**: si la lista contiene a “PERSONAL PRUEBA” (`national_id=null`), la búsqueda lo mostrará pero `sellTicketForCollaborator` lanza `'national_id es requerido'` ([src/services/ticketSalesService.ts:51](src/services/ticketSalesService.ts)).
- **Riesgo**: la búsqueda carga el catálogo completo en memoria. Para varios miles de colaboradores está bien; si la lista crece a decenas de miles habrá que mover el filtro al servidor.

### 1.5 Resumen de bloqueos críticos

| # | Bloqueo | Impacto |
|---|---|---|
| B1 | `claim_ticket` firma desincronizada cliente↔SQL | Activar ticket adicional desde dashboard se rompe en producción |
| B2 | `submitPrediction` no escribe a Supabase | Las predicciones del usuario nunca llegan a `prediction_match_scores` |
| B3 | `AdminResultsPage` es 100% mock | TTHH no puede cargar resultados ni recalcular |
| B4 | `score_bracket_crosses`, `score_advancement`, `champion_bonus`, `runner_up_bonus` devuelven 0 | El ranking no refleja las reglas de la UI |
| B5 | `build_predicted_bracket` no usa matriz oficial | Se pueden guardar predicciones inconsistentes con los cruces oficiales |
| B6 | Seed (`13_seed_demo_worldcup.sql`) solo tiene 3 grupos / 12 equipos | No se puede probar el flujo real sobre Supabase |
| B7 | Tipos del cliente desconocen tablas de scoring/predictions | Saving from UI requires expanding `Database` type |
| B8 | `sell_ticket` cliente no maneja `national_id=null` graciosamente | Caso “PERSONAL PRUEBA” explota la UI |

---

## 2. Validación de la lógica de quinielas

### 2.1 Reglas de puntos finales que vamos a oficializar

Para evitar el desajuste UI↔DB, fijamos **una sola tabla** de puntos que vivirá en `app_config` y en `lib/scoring.ts`:

| Concepto | Puntos | Aplica en |
|---|---|---|
| Marcador exacto fase de grupos | 3 | Cada partido GROUP “oficial” |
| Resultado correcto (1X2) fase de grupos | 1 | Cada partido GROUP “oficial” |
| Posición exacta de equipo en grupo (1.º/2.º/3.º) | 1 | Por equipo al cerrar grupos |
| Marcador exacto eliminatorias | 3 | R32→Final |
| Resultado correcto eliminatorias (90′) | 1 | R32→Final |
| Selección que avanza por ronda (sin importar cruce) | R32=1, R16=2, QF=3, SF=4 | Por equipo que pase |
| Cruce correcto por ronda | 1 | Por par exacto que se enfrente, sin importar local/visitante |
| Bono campeón | 10 | Campeón correcto |
| Bono 3.º puesto | 5 | Tercer puesto correcto |

> Si alguna regla difiere de la intención de TTHH, se ajusta acá y se propaga a `scoring.ts` y a `score_*` SQL. Esta tabla es la fuente única de verdad.

### 2.2 Matriz oficial R32 (a sembrar en `matches`)

| Partido | Local | Visitante |
|---|---|---|
| 73 | 2A | 2B |
| 74 | 1E | mejor 3.º de {A,B,C,D,F} |
| 75 | 1F | 2C |
| 76 | 1C | 2F |
| 77 | 1I | mejor 3.º de {C,D,F,G,H} |
| 78 | 2E | 2I |
| 79 | 1A | mejor 3.º de {C,E,F,H,I} |
| 80 | 1L | mejor 3.º de {E,H,I,J,K} |
| 81 | 1D | mejor 3.º de {B,E,F,I,J} |
| 82 | 1G | mejor 3.º de {A,E,H,I,J} |
| 83 | 2K | 2L |
| 84 | 1H | 2J |
| 85 | 1B | mejor 3.º de {E,F,G,I,J} |
| 86 | 1J | 2H |
| 87 | 1K | mejor 3.º de {D,E,I,J,L} |
| 88 | 2D | 2G |

Y los cruces posteriores (R16→Final) ya están correctos en el cliente, hay que replicarlos en `matches` con `home_slot/away_slot` apuntando a `Ganador Partido N` / `Perdedor Partido N`.

---

## 3. Plan de cierre (a ejecutar en orden)

### Fase A — Cierre SQL (objetivo: ejecutar todo en Supabase y probar de punta a punta)

1. **A1. Alinear `claim_ticket`.** Dejar UNA sola firma. Recomendación: usar la nueva `claim_ticket(p_national_id text, p_ticket_code text)` de `14_real_person_profile_integration.sql` y `DROP` la vieja en `99_reset_dev.sql`. Cambiar el cliente para mandar `p_national_id` + `p_ticket_code`.
   - Archivos a tocar: [supabase/sql/14_real_person_profile_integration.sql](supabase/sql/14_real_person_profile_integration.sql), [src/hooks/useTickets.ts](src/hooks/useTickets.ts), [src/types/database.ts](src/types/database.ts).

2. **A2. Completar el fixture oficial.** Reemplazar `13_seed_demo_worldcup.sql` por un seed real con:
   - 48 equipos repartidos en 12 grupos (A–L) con `seed_order` 1–4.
   - 72 partidos GROUP con `match_no` 1–72, `group_code`, `home_team_id`, `away_team_id`, fechas y estadios oficiales.
   - 16 R32 (`match_no` 73–88) con `home_slot`/`away_slot` literales del tipo `'2A'`, `'1E'`, `'3A/B/C/D/F'`, ….
   - 8 R16 (89–96), 4 QF (97–100), 2 SF (101–102), 1 3.º (103) y 1 Final (104) con `home_slot`/`away_slot` tipo `'Ganador Partido 73'`/`'Perdedor Partido 101'`.
   - Fuente única: la matriz de la sección 2.2.
   - Archivo nuevo: `supabase/sql/13_seed_worldcup_2026.sql` (o reescribir el existente). Mantener `on conflict (match_no/fifa_code) do update set …` para idempotencia.

3. **A3. Cerrar `build_predicted_bracket`.** Reescribir la función para que:
   - Tome `predicted_group_standings` (1.º y 2.º por grupo).
   - Calcule **mejores 8 terceros** con la misma fórmula del cliente (`standings.ts`).
   - Resuelva los 16 slots R32 respetando `allowedGroupCodes` con la misma matriz de la sección 2.2 (puede ser una tabla `r32_third_slot_rules(match_no, allowed_groups text[])` poblada en el mismo archivo 13).
   - Inserte 16 filas R32 en `predicted_bracket_slots` (no solo 1.º y 2.º).
   - Propague R16/QF/SF/3.º/Final usando el ganador predicho de cada `prediction_match_scores`.
   - Archivos: [supabase/sql/08_functions_predictions.sql](supabase/sql/08_functions_predictions.sql).

4. **A4. Cerrar scoring SQL.** Implementar realmente:
   - `score_bracket_crosses(p_ticket_id)`: `+1` por cada par real vs predicho que coincida sin importar local/visitante, en cada ronda.
   - `score_advancement(p_ticket_id)`: `+R32=1, R16=2, QF=3, SF=4` por cada equipo que avance y haya sido predicho avanzando en esa ronda.
   - `champion_bonus`: `+10` si el campeón predicho == real (winner del partido 104).
   - `runner_up_bonus`: usado como bono de **3.º puesto** = `+5` si el ganador del partido 103 predicho == real. Renombrar a `third_place_bonus` para no confundir.
   - `recalculate_ticket_score`: sumar todo correctamente.
   - Archivo: [supabase/sql/10_functions_scoring.sql](supabase/sql/10_functions_scoring.sql).

5. **A5. Endurecer `sell_ticket` para `national_id` ausente.** En la nueva sobrecarga de 7 args, si llega `national_id` vacío:
   - Bloquear con mensaje claro: `'Este colaborador no tiene cédula en HR. Cargar manualmente antes de vender.'`.
   - Que el cliente recoja ese mensaje y muestre un toast amigable.
   - Archivos: [supabase/sql/14_real_person_profile_integration.sql](supabase/sql/14_real_person_profile_integration.sql), [src/services/ticketSalesService.ts](src/services/ticketSalesService.ts), [src/components/admin/SellTicketPanel.tsx](src/components/admin/SellTicketPanel.tsx).

6. **A6. Vista `v_ranking_public` consistente con scoring.** Después de A4, la columna `bonus_points` queda `group_position + cross + advancement + champion + third_place`. Validar con un ticket de prueba que `total_points = exact*3 + result_only*1 + bonus_points`.

7. **A7. Reset y orden de ejecución final.** Documentar en `supabase/README.md` el orden:
   ```
   99_reset_dev.sql   (opcional, solo dev)
   00 → 14            (siempre en orden)
   ```
   Verificar idempotencia ejecutando `00→14` dos veces seguidas sin errores.

### Fase B — Cierre cliente (objetivo: que la UI use lo que el SQL ya garantiza)

8. **B1. Persistir predicción en Supabase.** Reemplazar `submitPrediction` puramente local por:
   - Por cada partido en `groupScores` y `bracketMatches` → `supabase.rpc('save_prediction_match_score', { p_ticket_id, p_match_id, p_home_score, p_away_score, p_penalty_winner_team_id })`.
   - Cuando todos los partidos válidos están guardados → `supabase.rpc('submit_prediction', { p_ticket_id })`.
   - Mantener `localStorage` solo como “draft” offline; al cargar, hidratar desde Supabase si existe predicción en backend.
   - Archivos: [src/hooks/usePrediction.ts](src/hooks/usePrediction.ts), [src/types/database.ts](src/types/database.ts).

9. **B2. AdminResultsPage real.** Sustituir mock por:
   - Carga de `matches` reales (vía `useTournamentFixture` nuevo o select directo a `matches`).
   - Por cada resultado nuevo → `supabase.rpc('set_actual_match_result', …)` (ya debe existir en `09_functions_actual_results.sql`; si no, crearla).
   - Botón “Recalcular” → `supabase.rpc('recalculate_all_scores')` y refrescar `v_ranking_public`.
   - Archivos: [src/pages/AdminResultsPage.tsx](src/pages/AdminResultsPage.tsx) y nuevos hooks `useFixture`, `useAdminResults`.

10. **B3. Activar ticket adicional desde dashboard.** Mandar `{ p_national_id, p_ticket_code }` a `claim_ticket`. Validar con un usuario con 2 tickets.
    - Archivo: [src/hooks/useTickets.ts](src/hooks/useTickets.ts) y `src/types/database.ts`.

11. **B4. Reglas de scoring centralizadas.** Mover la tabla 2.1 a un único `lib/scoringRules.ts` que se exporte tanto a UI como (vía constantes copiadas) a `app_config`. Cargar al boot: `supabase.from('app_config').select().eq('key','scoring_rules')` para detectar discrepancias.

12. **B5. Manejo de errores en `personProfileService`.** Reintentos con backoff exponencial (3 intentos) y cache parcial en memoria si una página falla. Mensaje claro al admin.
    - Archivo: [src/services/personProfileService.ts](src/services/personProfileService.ts).

13. **B6. Búsqueda de colaborador**: filtrar fuera resultados con `national_id` ausente o mostrarlos como **deshabilitados** con explicación (“sin cédula registrada”). Evita que el admin clique y reciba un error feo.
    - Archivos: [src/components/admin/EmployeeSearch.tsx](src/components/admin/EmployeeSearch.tsx), [src/utils/searchCollaborators.ts](src/utils/searchCollaborators.ts).

### Fase C — Pruebas E2E (objetivo: que TTHH y un colaborador real corran el flujo)

14. **C1. Smoke**: `npm run typecheck` y `npm run build` sin errores.
15. **C2. Mock fallback intacto**: con `.env` vacío, `USE_MOCKS=true` debe seguir permitiendo navegar todo. Verificar `Dashboard`, `Prediction`, `Ranking`, `Admin*`.
16. **C3. Supabase end-to-end** con `.env` apuntando al proyecto real:
    1. Cargar Edge Function pull-person-profile.
    2. Login como `super_admin`. Vender 2 tickets a 2 cédulas distintas.
    3. Cerrar sesión. Registrar al colaborador 1 con su ticket → debe iniciar sesión, ver el ticket reclamado, hacer una predicción completa, enviarla.
    4. Repetir con colaborador 2 (predicciones distintas).
    5. Login `admin_tthh` → AdminResultsPage carga los 72 partidos de grupo, ingresa resultados de los primeros 12, marca `status='official'`, recálculo.
    6. Verificar `v_ranking_public`: los puntos deben coincidir con los calculados a mano según tabla 2.1.
    7. Volver a colaborador 1: ranking público lo muestra con sus puntos.
17. **C4. Casos de error explícitos**:
    - Vender un ticket a un perfil con `national_id=null` → mensaje claro.
    - Reclamar un código ya `claimed` → mensaje claro.
    - Registrarse con cédula que ya tiene cuenta → mensaje claro pidiendo activar desde el panel.
    - Intentar guardar predicción después del deadline → bloqueado por `validate_deadline`.

### Fase D — Cosas que NO entran en este cierre (anotadas para después)

- Migración del fixture cuando FIFA publique sedes definitivas (estadios y fechas pueden cambiar).
- Penales en grupos: actualmente no aplican; sólo en eliminatoria empatada. Confirmado.
- Sincronización masiva de empleados (sólo se traen on-demand desde la Edge Function).
- Tests automatizados (no hay runner configurado; se asume QA manual por ahora).
- Internacionalización: la UI sigue siendo monolingüe en español.

---

## 4. Archivos clave de referencia

### Cliente
- [src/lib/scoring.ts](src/lib/scoring.ts) — reglas de puntos UI.
- [src/lib/standings.ts](src/lib/standings.ts) — clasificación de grupos y mejores terceros.
- [src/lib/bracketBuilder.ts](src/lib/bracketBuilder.ts) — propagación R32→Final.
- [src/lib/thirdPlaceAssignment.ts](src/lib/thirdPlaceAssignment.ts) — asignación de 3.º a slots.
- [src/hooks/usePrediction.ts](src/hooks/usePrediction.ts) — submit/draft predicción.
- [src/hooks/useTickets.ts](src/hooks/useTickets.ts) — claim_ticket (firma a corregir).
- [src/services/ticketSalesService.ts](src/services/ticketSalesService.ts) — sell_ticket cliente.
- [src/services/personProfileService.ts](src/services/personProfileService.ts) — Edge Function pull-person-profile.
- [src/pages/AdminResultsPage.tsx](src/pages/AdminResultsPage.tsx) — hoy es mock puro.
- [src/types/database.ts](src/types/database.ts) — tipado RPCs (a actualizar).

### SQL
- [supabase/sql/06_functions_auth_profiles.sql](supabase/sql/06_functions_auth_profiles.sql) — auth/registro OK.
- [supabase/sql/07_functions_tickets.sql](supabase/sql/07_functions_tickets.sql) — `complete_registration_with_ticket`.
- [supabase/sql/08_functions_predictions.sql](supabase/sql/08_functions_predictions.sql) — `build_predicted_bracket` por cerrar.
- [supabase/sql/10_functions_scoring.sql](supabase/sql/10_functions_scoring.sql) — TODOs por cerrar.
- [supabase/sql/11_views_rankings.sql](supabase/sql/11_views_rankings.sql) — vistas públicas.
- [supabase/sql/13_seed_demo_worldcup.sql](supabase/sql/13_seed_demo_worldcup.sql) — reemplazar por fixture oficial.
- [supabase/sql/14_real_person_profile_integration.sql](supabase/sql/14_real_person_profile_integration.sql) — integración HR + nuevas firmas.

---

## 5. Verificación / Criterios de aceptación

1. `npm run typecheck` y `npm run build` pasan limpios.
2. Ejecutar de cero en un proyecto Supabase nuevo `99_reset_dev.sql` (opcional) + `00→14` en orden, sin errores y dos veces seguidas (idempotente).
3. Vender, registrar, reclamar, predecir, cargar resultados y recalcular, todo contra Supabase real con el escenario C3.
4. Para un ticket cuyas predicciones se conocen, los puntos en `v_ranking_public` coinciden exactamente con los puntos calculados a mano usando la tabla 2.1.
5. Las predicciones no se pueden modificar después del deadline (`prediction_deadline` en `app_config`).
6. Un colaborador con `national_id=null` proveniente de la Edge Function NO rompe la UI: aparece deshabilitado en la búsqueda y `sell_ticket` retorna un error legible si se fuerza.
7. `claim_ticket` desde el dashboard del colaborador funciona con un ticket adicional vendido por TTHH.

---

## 6. Checklist ejecutable

- [ ] A1 alinear `claim_ticket`
- [ ] A2 seed fixture oficial 48 equipos / 104 partidos
- [ ] A3 cerrar `build_predicted_bracket` con matriz oficial
- [ ] A4 cerrar `score_bracket_crosses`, `score_advancement`, bonos campeón/3.º
- [ ] A5 endurecer `sell_ticket` ante `national_id` vacío
- [ ] A6 validar `v_ranking_public`
- [ ] A7 documentar orden de ejecución
- [ ] B1 persistir predicciones a Supabase
- [ ] B2 AdminResultsPage real
- [ ] B3 activar ticket adicional desde dashboard
- [ ] B4 reglas de scoring centralizadas
- [ ] B5 retries en personProfileService
- [ ] B6 búsqueda de colaborador maneja sin cédula
- [ ] C1–C4 pruebas
