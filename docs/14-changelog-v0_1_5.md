# v0.1.5 — Auditoría react-doctor + propagación de eliminatorias

Fecha: 2026-05-15.

## Resumen ejecutivo

Sprint de limpieza y correcciones. Tres bloques:

1. **Bug crítico de scoring corregido**: cambiar el ganador de un partido upstream propaga ahora a los partidos downstream (R32 → Final).
2. **Auditoría de calidad react-doctor**: aplicados los fixes de mayor impacto, dejados anotados los pendientes con alto riesgo de regresión.
3. **Validación end-to-end del SQL**: los parches que se habían dado como hot-fix por chat ahora viven en los archivos `00–17` y en `15_resync_v0_1_1.sql`. Reset desde cero produce el estado correcto sin patches manuales.

---

## 1. Fix crítico — propagación en eliminatorias

### Síntoma
Al corregir el resultado de un partido de R32 (p. ej. P73 Ecuador→Colombia como ganador), los partidos downstream que decían `home_slot = "Ganador Partido 73"` (en este caso P90) seguían mostrando al equipo anterior. Lo mismo aplicaba a los mejores terceros: cambiar standings de grupos no actualizaba los R32 con slot tipo `3A/B/C/D/F`.

### Causa
`resolve_actual_knockout_teams` (en [supabase/sql/09_functions_actual_results.sql](../supabase/sql/09_functions_actual_results.sql)) usaba la condición `if v_match.home_team_id is null` para decidir si rellenar el equipo. Una vez que el slot quedaba lleno, no se volvía a tocar.

### Fix
Re-resolver siempre que el partido downstream **no** esté `'official'` y comparar con `is distinct from`. Sobrescribir si cambió. Si el downstream ya está official, no se toca (protege resultados ya guardados; el admin tendría que re-guardarlo manualmente).

Archivos modificados:
- [supabase/sql/09_functions_actual_results.sql](../supabase/sql/09_functions_actual_results.sql) — función definitiva.
- [supabase/sql/15_resync_v0_1_1.sql](../supabase/sql/15_resync_v0_1_1.sql) — copia con el mismo fix + ahora también incluye `recalculate_actual_group_standings` con `where true` (antes faltaba en el catch-up).

---

## 2. Auditoría react-doctor

Total de hallazgos del report: 349 diagnósticos (la mitad son duplicados por la presencia del worktree en `.claude/worktrees/`).

### Aplicado

| Severidad | Regla | Acción |
|---|---|---|
| 🔴 error | `no-nested-component-definition` | `SaveStatusBadge` movido a module-scope con props explícitas (antes estaba dentro de `PredictionWizard`, se recreaba en cada render destruyendo state interno). |
| 🟠 warning | `no-array-index-as-key` | `ManualTieBreakerPanel` ahora usa `${groupCode}-${teamId}` como key. |
| 🟠 warning | `no-derived-state-effect` | `RegisterPage` invalida la validación por derivación (clave cédula+ticket) en lugar de resetearla en un `useEffect`. |
| 🟠 warning | `prefer-use-sync-external-store` + `rerender-lazy-state-init` | `App.tsx` usa `useSyncExternalStore` para el hash routing en lugar del patrón `useState + useEffect(hashchange)`. |
| 🟡 warning | `prefer-dynamic-import` | `AdminPdfPanel` carga `@react-pdf/renderer` con `await import()` perezoso (antes estaba al top del módulo). El chunk de 1.4 MB sale del bundle inicial. |
| 🟡 warning | `design-no-redundant-padding-axes` | `BottomNav` usa `p-2`. |
| 🟡 warning | `design-no-redundant-size-axes` | `AdminMetricCard`, `LoadingState`, `RankingPodium`, `TicketCard`, `TeamIdentity`, `AdminPdfPanel` usan `size-N`. |
| 🟢 dead code | `knip/files` | 14 archivos huérfanos eliminados (ver lista abajo). |
| 🟢 dead code | `knip/exports` | `cedulaToAuthEmail` ahora es interno en `auth.ts`. |

### Archivos eliminados (dead code)

```
src/types/database.ts
src/components/bracket/BracketBoard.tsx
src/components/bracket/BracketMatchCard.tsx
src/components/bracket/BracketRound.tsx
src/components/bracket/PenaltyWinnerSelect.tsx
src/components/prediction/BestThirdsPanel.tsx
src/components/prediction/GroupPredictionBoard.tsx
src/components/prediction/GroupStandingsTable.tsx
src/components/prediction/MatchScoreInput.tsx
src/components/prediction/PredictionSummary.tsx
src/components/admin/ActualResultForm.tsx
src/components/ranking/ScoreBreakdownModal.tsx
src/components/ui/Modal.tsx
src/components/ui/Toast.tsx
```

Verificación previa: `grep -r` confirmó que ningún archivo de `src/` importa estos módulos.

### NO aplicado (por diseño / decisión)

| Regla | Razón |
|---|---|
| `design-no-bold-heading` (74 hits) | La identidad visual de WorldCupX/CoreX usa `font-black` (700-900) en headings deliberadamente. Cambiar a `font-semibold` rompería la marca. Decisión: mantener. |
| `prefer-useReducer` / `no-cascading-set-state` (en hooks y `AdminResultsPage`) | Refactor estructural sin bug funcional, alta superficie de regresión. Pospuesto. |
| `js-combine-iterations`, `js-tosorted-immutable`, `js-flatmap-filter` | Micro-perf con baja recompensa y alta probabilidad de regresión sutil. |
| `js-set-map-lookups` en `searchCollaborators:55` | Falso positivo: el `.includes()` ahí es `String.prototype.includes`, no `Array.includes`. |
| `async-await-in-loop` en `personProfileService` | Paginación: el await secuencial es correcto, paralelizar rompería el orden. |
| `design-no-em-dash-in-jsx-text` (4 hits en PDFs) | Son placeholders `—` cuando no hay equipo asignado, no es texto generado. |
| `rendering-hydration-mismatch-time` | App es SPA puro (sin SSR), no aplica. |

---

## 3. Validación del SQL 00 → 17

Todos los parches que se habían dado por chat ahora viven en los archivos numerados:

| Parche | Origen | Estado en `00→17` |
|---|---|---|
| Cruce flexible eliminatorias (mismos 2 equipos, cualquier match_no, cualquier orden) | v0.1.4 | `10_functions_scoring.sql` (definitivo) + `15_resync_v0_1_1.sql` (catch-up) |
| Cruce exacto es prerequisito, no categoría separada de puntos | v0.1.4 | `10_functions_scoring.sql` |
| `recalculate_actual_group_standings` con `where true` (protección Supabase contra DELETE sin WHERE) | hot-fix chat | `09_functions_actual_results.sql` + ahora también `15_resync_v0_1_1.sql` |
| `build_actual_bracket` con `where true` | hot-fix chat | `09_functions_actual_results.sql` + `15_resync_v0_1_1.sql` |
| `gc.official_count >= 6` gate en `score_group_positions` (no regalar posiciones cuando el grupo no ha jugado) | v0.1.4 | `10_functions_scoring.sql` |
| Propagación de ganador en eliminatorias (this release) | v0.1.5 | `09_functions_actual_results.sql` + `15_resync_v0_1_1.sql` |
| `99_reset_dev.sql` con cascade primero en tablas (no chocar con `is_admin()`) | hot-fix chat | `99_reset_dev.sql` |

### Orden de ejecución desde cero

Para una instalación nueva o reset total:

1. (Opcional reset) Correr el bloque destructivo de `99_reset_dev.sql` y borrar usuarios de Auth.
2. Correr en orden: `00 → 17`.
3. (Opcional) Crear admin estándar (cédula `0000000001`) usando el bloque que dejé en este chat.
4. Vender ticket y registrar usuarios reales por la app.

No queda ningún parche pendiente que correr aparte. Si el usuario re-corre los SQL, todo es idempotente (`create or replace`, `on conflict do update`, `drop policy if exists`).

---

## 4. Bundle post-cleanup

- `index-*.js`: 295.94 kB (gzip 85.68 kB) — bundle principal.
- `react-pdf.browser-*.js`: 1.46 MB (gzip 491 kB) — **ahora chunk separado** que solo se carga cuando el admin pide un PDF.
- Antes: react-pdf se cargaba en el bundle inicial. Mejora de ~1 MB en first paint para usuarios que no descargan PDFs.

---

## 5. Próximo paso para producción

1. **Aplicar el patch SQL** (opcional, ya está integrado en archivos):
   - Si tu Supabase ya corrió 00→17 y solo falta la propagación: correr el bloque de `resolve_actual_knockout_teams` que te di por chat. Es la única función que cambió.
   - Si vas a resetear desde cero: `99_reset_dev` + `00→17`. Sin patches adicionales.
2. **Desplegar el frontend**: ya hecho con `git push origin main`. GitHub Actions despliega a Pages automáticamente.
3. **Validar el fix** con la query de verificación que te di (cargar P73, verificar P90, etc.).
