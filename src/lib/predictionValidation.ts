import type { Match, ScorePrediction, StandingRow } from '../types/tournament';
import type { PredictedBracketMatch, ThirdPlaceSlot } from '../types/prediction';
import { isGroupStageComplete } from './standings';

export function validateGroupStep(matches: Match[], predictions: ScorePrediction[]): string[] {
  if (isGroupStageComplete(matches, predictions)) return [];
  return ['Completa todos los marcadores de fase de grupos antes de construir eliminatorias.'];
}

export function validateThirdPlaceAssignments(slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): string[] {
  const errors: string[] = [];
  const bestThirdByTeam = new Map(bestThirds.map((row) => [row.teamId, row]));
  const validTeamIds = new Set(bestThirdByTeam.keys());
  const assigned = slots.map((slot) => slot.assignedTeamId).filter(Boolean) as string[];
  if (slots.some((slot) => !slot.assignedTeamId)) errors.push('Asigna un tercero clasificado a cada slot disponible.');
  if (new Set(assigned).size !== assigned.length) errors.push('No puedes repetir el mismo tercero en dos slots.');
  if (assigned.some((teamId) => !validTeamIds.has(teamId))) errors.push('Solo puedes usar equipos que estén entre los mejores terceros.');
  if (slots.some((slot) => {
    if (!slot.assignedTeamId || !slot.allowedGroupCodes?.length) return false;
    const row = bestThirdByTeam.get(slot.assignedTeamId);
    return !row || !slot.allowedGroupCodes.includes(row.groupCode);
  })) errors.push('Hay terceros asignados a cruces donde su grupo no está permitido.');
  return errors;
}

export function sanitizeThirdPlaceAssignments(slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): ThirdPlaceSlot[] {
  const bestThirdByTeam = new Map(bestThirds.map((row) => [row.teamId, row]));
  return slots.map((slot) => {
    if (!slot.assignedTeamId) return slot;
    const row = bestThirdByTeam.get(slot.assignedTeamId);
    if (!row) return { ...slot, assignedTeamId: null };
    if (slot.allowedGroupCodes?.length && !slot.allowedGroupCodes.includes(row.groupCode)) return { ...slot, assignedTeamId: null };
    return slot;
  });
}

export function validateKnockout(matches: PredictedBracketMatch[]): string[] {
  const missing = matches.filter((match) => match.homeTeamId && match.awayTeamId && (!match.advancingTeamId || match.homeScore === null || match.awayScore === null));
  if (missing.length) return ['Completa marcadores y clasificados en todas las eliminatorias disponibles.'];
  return [];
}
