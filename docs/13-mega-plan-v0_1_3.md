# Mega Plan v0.1.3 — WorldCupX listo para pruebas en producción

> Objetivo: pasar de "casi funciona" a **"operacional, eficiente y testeable desde celular"**.

## Diagnóstico de los problemas reportados

1. **Resultados oficiales no se guardan en BD** → puntos no se calculan ni se ven.
   - Causa probable: el guardado actual es implícito (al perder foco del input). El admin no ve confirmación. Si `save_actual_result` falla, el error se traga.
   - Solución: botón **"Guardar"** explícito por partido + indicador de estado por fila (idle/guardando/guardado/error).

2. **PDFs**: nombres se montan en la cuadrícula, sin banderas.
   - Causa: layout actual usa columnas fijas que se desbordan + badges con código FIFA en lugar de banderas reales.
   - Solución: layout más generoso + cargar banderas SVG inline via `<Svg>` de react-pdf, con fallback a badge si falla.

3. **Admin Tickets sin búsqueda ni alias visible**.
   - Hoy la tabla muestra `WCX-****` (poco útil para TTHH).
   - Solución: buscador + columna alias "Ticket N" del view.

4. **PDF KO descargable sin grupos cargados** → R32 sale con slots literales.
   - Solución: deshabilitar botón "PDF KO" hasta que la predicción de grupos esté 100% completa.

5. **Ranking solo filtra por área**.
   - Solución: agregar filtro por `job_classification_code`.

6. **Sin recibo PDF al enviar predicción**.
   - Solución: tras `submit_complete_prediction` ok, ofrecer descarga de "Mi predicción" (grupos + bracket + campeón).

7. **Mobile no validado**.
   - Solución: auditar pantallas críticas, agrandar tap targets, apilar columnas en < 640px.

---

## Fases (en orden de prioridad)

### Fase 1 — Guardado confiable de resultados oficiales (BLOQUEANTE)

**Archivos**:
- [src/components/admin/AdminGroupResultsPanel.tsx](src/components/admin/AdminGroupResultsPanel.tsx) — agregar botón "Guardar" por fila.
- [src/components/admin/AdminKnockoutResultsPanel.tsx](src/components/admin/AdminKnockoutResultsPanel.tsx) — idem.
- [src/pages/AdminResultsPage.tsx](src/pages/AdminResultsPage.tsx) — exponer `saveStatusByMatch: Record<matchId, 'idle'|'saving'|'saved'|'error'>` y manejar la lógica.
- [src/hooks/useAdminMatchResults.ts](src/hooks/useAdminMatchResults.ts) (nuevo) — encapsula la lógica de save/recalc/fetch para no inflar la página.

**Cambios funcionales**:
1. Cada fila de partido tiene un botón **"Guardar"** que llama `save_actual_result` y muestra estado.
2. El botón se deshabilita si ambos scores no son números válidos (≥ 0).
3. Después de un save exitoso, fixture recarga y bracket se refresca.
4. **Botón global "Recalcular ranking"** más prominente al final, con badge "Pendiente de recálculo · N cambios desde el último".

### Fase 2 — Admin Tickets ergonómico

**Archivos**:
- [supabase/sql/17_v0_1_3_admin_search_and_filters.sql](supabase/sql/17_v0_1_3_admin_search_and_filters.sql) (nuevo) — view `v_admin_tickets` con alias.
- [src/hooks/useAdminTickets.ts](src/hooks/useAdminTickets.ts) — usar la nueva view.
- [src/components/admin/TicketAdminTable.tsx](src/components/admin/TicketAdminTable.tsx) — buscador + columna alias visible.

**Cambios**:
1. View `v_admin_tickets`: incluye `alias` (Ticket N por employee_id), `prediction_status`, `groups_filled` (count de grupos predichos), `code` real (oculto pero disponible).
2. Buscador en TicketAdminTable: filtra por **cédula · nombre · alias**.
3. Botón **"PDF KO"** disabled cuando `groups_filled < 72` con tooltip explicando.

### Fase 3 — Mobile-friendly

**Archivos**:
- [src/index.css](src/index.css) — utilities para tap targets.
- Varios componentes para revisar responsive.

**Cambios**:
1. Inputs de score: `min-w-[56px]` `h-[44px]` `text-lg` en mobile.
2. Tablas admin: en `< sm`, apilar columnas en cards.
3. AdminSidebar oculto en mobile, BottomNav siempre visible (ya existe).
4. PredictionWizard: tabs scrollables horizontalmente en mobile.

### Fase 4 — PDFs

**Archivos**:
- [src/lib/pdf/groupStageTemplate.tsx](src/lib/pdf/groupStageTemplate.tsx) — layout fix + banderas reales.
- [src/lib/pdf/knockoutTemplate.tsx](src/lib/pdf/knockoutTemplate.tsx) — idem.
- [src/lib/pdf/predictionReceiptTemplate.tsx](src/lib/pdf/predictionReceiptTemplate.tsx) (nuevo) — recibo de predicción enviada.
- [src/components/prediction/PredictionWizard.tsx](src/components/prediction/PredictionWizard.tsx) — botón "Descargar mi predicción" tras submit.
- [src/lib/pdf/flagLoader.ts](src/lib/pdf/flagLoader.ts) (nuevo) — utility para fetch + parse del SVG de bandera.

**Cambios**:
1. Layout: nombres con truncate, padding generoso, evitar overflow.
2. Banderas: fetch del SVG inline, parsear, renderizar con react-pdf `<Svg>`. Cache por fifa_code para no refetchear.
3. Nuevo PDF **predictionReceipt**: muestra todas las predicciones (con flags), campeón, 3er puesto. Para que el colaborador lo guarde o imprima.

### Fase 5 — Filtros y refinamientos

**Archivos**:
- [src/pages/RankingPage.tsx](src/pages/RankingPage.tsx) — agregar filtro por job_classification_code.
- [supabase/sql/17_v0_1_3_admin_search_and_filters.sql](supabase/sql/17_v0_1_3_admin_search_and_filters.sql) — extender `v_ranking_public` para exponer `job_classification_code`.

**Cambios**:
1. `v_ranking_public` ahora incluye `job_classification_code` del employee.
2. RankingPage tiene dos `<select>`: Área y Clasificación.

---

## Validaciones obligatorias antes de aprobar producción

| # | Validar | Cómo |
|---|---|---|
| 1 | Guardado de resultado oficial persiste en BD | Cargar score grupo P1 1-0 → click Guardar → status verde → query `select home_score, status from matches where match_no=1` muestra `1, 'official'` |
| 2 | Recalc trae puntos correctos | Tras guardar varios resultados → click Recalcular → `select total_points from ticket_scores where ticket_id=X` > 0 |
| 3 | Auto-save de predicción persiste | Cambiar score en /prediction → ver badge "Guardado" → refresh → score sigue |
| 4 | Admin edit funciona | /admin/tickets/X/edit → cambiar score → "Guardado" → como colaborador X, ver el mismo valor |
| 5 | PDF KO bloqueado sin grupos | TicketAdminTable: si groups_filled < 72, botón gris con tooltip |
| 6 | Mobile usable | Abrir en celular `/admin/results` → ingresar score → confirmar tap-friendly |
| 7 | Recibo PDF post-submit | Submit predicción → modal/banner ofrece descargar PDF |
| 8 | Search admin tickets funciona | TicketAdminTable: tipear "rivera" / "Ticket 1" / "010742" → filtra |
| 9 | Filtro ranking por classification | RankingPage: select `AGRICOLA` → solo agrícolas |

---

## Lo que NO entra en v0.1.3 (futuro)

- Estadísticas por área (gráficos)
- Notificaciones push
- Edición masiva de predicciones
- Integración WhatsApp para recordatorios

---

## Files que se crean/modifican (resumen)

| Acción | File |
|---|---|
| nuevo | `supabase/sql/17_v0_1_3_admin_search_and_filters.sql` |
| nuevo | `src/hooks/useAdminMatchResults.ts` |
| nuevo | `src/lib/pdf/flagLoader.ts` |
| nuevo | `src/lib/pdf/predictionReceiptTemplate.tsx` |
| modif | `src/components/admin/AdminGroupResultsPanel.tsx` |
| modif | `src/components/admin/AdminKnockoutResultsPanel.tsx` |
| modif | `src/components/admin/TicketAdminTable.tsx` |
| modif | `src/components/prediction/PredictionWizard.tsx` |
| modif | `src/hooks/useAdminTickets.ts` |
| modif | `src/lib/pdf/groupStageTemplate.tsx` |
| modif | `src/lib/pdf/knockoutTemplate.tsx` |
| modif | `src/pages/AdminResultsPage.tsx` |
| modif | `src/pages/RankingPage.tsx` |
| modif | `src/index.css` (utilities tap-friendly) |
