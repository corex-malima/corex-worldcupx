import type { Match, ScorePrediction, StandingRow } from '../types/tournament';
import type { PredictedBracketMatch, ThirdPlaceSlot } from '../types/prediction';
import { getGroupsNeedingManualTieBreaker, isGroupStageComplete } from './standings';
import { validateThirdPlaceAssignmentSolvability } from './thirdPlaceAssignment';

export function validateGroupStep(matches: Match[], predictions: ScorePrediction[], standings: StandingRow[] = []): string[] {
  const errors: string[] = [];
  const complete = isGroupStageComplete(matches, predictions);
  if (!complete) errors.push('Completa todos los marcadores de fase de grupos antes de construir eliminatorias.');
  if (!complete) return errors;
  const pendingTieBreakers = getGroupsNeedingManualTieBreaker(standings);
  if (pendingTieBreakers.length) errors.push(`Resuelve desempates por fair play o sorteo/manual en: Grupo ${pendingTieBreakers.join(', Grupo ')}.`);
  return errors;
}

export function validateThirdPlaceAssignments(slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): string[] {
  const errors: string[] = [];
  const bestThirdByTeam = new Map(bestThirds.map((row) => [row.teamId, row]));
  const validTeamIds = new Set(bestThirdByTeam.keys());
  const assigned = slots.flatMap((slot) => slot.assignedTeamId ? [slot.assignedTeamId] : []);

  // Safety net: cuando hay mejores terceros clasificados (>=8) pero el fixture no
  // produjo slots, es un problema de datos. Bloqueamos para no dejar pasar al usuario.
  if (bestThirds.length >= 8 && slots.length === 0) {
    errors.push('No se pudieron generar los cruces de mejores terceros desde el fixture. Contacta a TTHH.');
    return errors;
  }

  if (bestThirds.length < slots.length) {
    errors.push('Calcula los mejores terceros antes de asignar cruces.');
  } else {
    const solvability = validateThirdPlaceAssignmentSolvability(slots, bestThirds);
    if (!solvability.ok) {
      errors.push(`Esta asignacion deja cruces sin terceros validos${solvability.blockedSlotLabels.length ? `: ${solvability.blockedSlotLabels.join(', ')}` : ''}. Usa asignacion automatica o ajusta los grupos.`);
    }
  }
  if (slots.length === 0 || slots.some((slot) => !slot.assignedTeamId)) {
    errors.push('Asigna un tercero clasificado a cada slot disponible (o usa "Asignar automaticamente").');
  }
  if (new Set(assigned).size !== assigned.length) errors.push('No puedes repetir el mismo tercero en dos slots.');
  if (assigned.some((teamId) => !validTeamIds.has(teamId))) errors.push('Solo puedes usar equipos que esten entre los mejores terceros.');
  if (slots.some((slot) => {
    if (!slot.assignedTeamId || !slot.allowedGroupCodes?.length) return false;
    const row = bestThirdByTeam.get(slot.assignedTeamId);
    return !row || !slot.allowedGroupCodes.includes(row.groupCode);
  })) errors.push('Hay terceros asignados a cruces donde su grupo no esta permitido.');
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
