/**
 * Helpers DEMO: generación de marcadores aleatorios para los botones
 * "Autorrellenar" del wizard de predicción y del panel Admin Resultados.
 *
 * Distribución sesgada hacia 0-3 con un 4 ocasional para que los resultados
 * se vean realistas (no todos 0-0). Math.random() basta — no necesitamos
 * reproducibilidad entre clicks; al contrario, queremos variedad cada vez.
 *
 * Este módulo se puede borrar entero cuando se cierre la demo. Ver nota en
 * constants.ts DEMO_AUTOFILL_ENABLED.
 */

const GROUP_DIST = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];

function pick(): number {
  return GROUP_DIST[Math.floor(Math.random() * GROUP_DIST.length)];
}

/** Marcador de fase de grupos: cualquier par (empate permitido). */
export function randomGroupScore(): [number, number] {
  return [pick(), pick()];
}

/** Marcador de eliminatorias: nunca empate (forzamos suma al home si saliera). */
export function randomKnockoutScore(): [number, number] {
  let h = pick();
  const a = pick();
  if (h === a) h += 1;
  return [h, a];
}
