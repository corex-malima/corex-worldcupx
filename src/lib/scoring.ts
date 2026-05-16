import type { ScorePrediction } from '../types/tournament';

// El scoring oficial vive en SQL (recalculate_ticket_score). Aquí solo necesitamos
// medir el progreso del usuario llenando su predicción (cuántos partidos / slots
// tiene completos sobre el total).
export function calculateProgress(predictions: ScorePrediction[], totalMatches: number, completedExtras = 0): number {
  if (!totalMatches) return 0;
  const completed = predictions.filter((prediction) => prediction.homeScore !== null && prediction.awayScore !== null).length;
  return Math.min(100, Math.round(((completed + completedExtras) / totalMatches) * 100));
}
