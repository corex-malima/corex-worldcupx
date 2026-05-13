export { calculateGroupStandings, getGroupsNeedingManualTieBreaker, getQualifiedTeams, isGroupStageComplete } from './standings';

export function isPredictionLocked(deadlineIso: string): boolean {
  return Date.now() >= new Date(deadlineIso).getTime();
}
