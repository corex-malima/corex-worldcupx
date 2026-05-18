import type { ThirdPlaceSlot } from '../types/prediction';
import type { StandingRow } from '../types/tournament';

function isAllowed(slot: ThirdPlaceSlot, row: StandingRow): boolean {
  return !slot.allowedGroupCodes?.length || slot.allowedGroupCodes.includes(row.groupCode);
}

// Versión rápida con Sets pre-construidos para evitar O(n) por isAllowed en el backtracking.
function isAllowedFast(allowedSet: Set<string> | null, row: StandingRow): boolean {
  return allowedSet === null || allowedSet.has(row.groupCode);
}

function buildAllowedMap(slots: ThirdPlaceSlot[]): Map<string, Set<string> | null> {
  const map = new Map<string, Set<string> | null>();
  for (const slot of slots) {
    map.set(slot.slotId, slot.allowedGroupCodes?.length ? new Set(slot.allowedGroupCodes) : null);
  }
  return map;
}

function search(slots: ThirdPlaceSlot[], candidates: StandingRow[], fixed = new Map<string, string | null>()): ThirdPlaceSlot[] | null {
  const fixedValues = Array.from(fixed.values()).filter(Boolean) as string[];
  if (new Set(fixedValues).size !== fixedValues.length) return null;
  const used = new Set(fixedValues);
  const allowedMap = buildAllowedMap(slots);
  const orderedSlots = slots.toSorted((a, b) => {
    const aFixed = fixed.has(a.slotId);
    const bFixed = fixed.has(b.slotId);
    if (aFixed !== bFixed) return aFixed ? -1 : 1;
    const aAllowed = allowedMap.get(a.slotId) ?? null;
    const bAllowed = allowedMap.get(b.slotId) ?? null;
    const aOptions = candidates.filter((row) => !used.has(row.teamId) && isAllowedFast(aAllowed, row)).length;
    const bOptions = candidates.filter((row) => !used.has(row.teamId) && isAllowedFast(bAllowed, row)).length;
    return aOptions - bOptions || a.order - b.order;
  });
  const assigned = new Map<string, string | null>(fixed);

  function backtrack(index: number): boolean {
    if (index >= orderedSlots.length) return true;
    const slot = orderedSlots[index];
    const allowedSet = allowedMap.get(slot.slotId) ?? null;
    const fixedTeamId = assigned.get(slot.slotId);
    if (fixedTeamId) {
      const fixedRow = candidates.find((row) => row.teamId === fixedTeamId);
      if (!fixedRow || !isAllowedFast(allowedSet, fixedRow)) return false;
      return backtrack(index + 1);
    }

    const options = candidates.filter((row) => !used.has(row.teamId) && isAllowedFast(allowedSet, row));
    for (const row of options) {
      assigned.set(slot.slotId, row.teamId);
      used.add(row.teamId);
      if (backtrack(index + 1)) return true;
      used.delete(row.teamId);
      assigned.set(slot.slotId, null);
    }
    return false;
  }

  if (!backtrack(0)) return null;
  return slots.map((slot) => ({ ...slot, assignedTeamId: assigned.get(slot.slotId) ?? null }));
}

export function findValidThirdPlaceAssignment(slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): ThirdPlaceSlot[] | null {
  return search(slots.map((slot) => ({ ...slot, assignedTeamId: null })), bestThirds);
}

export function validateThirdPlaceAssignmentSolvability(slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): { ok: boolean; blockedSlotLabels: string[] } {
  const fixed = new Map<string, string | null>();
  slots.forEach((slot) => {
    if (slot.assignedTeamId) fixed.set(slot.slotId, slot.assignedTeamId);
  });
  const result = search(slots, bestThirds, fixed);
  if (result) return { ok: true, blockedSlotLabels: [] };

  const blockedSlotLabels = slots.flatMap((slot) => {
    if (slot.assignedTeamId) return [];
    const hasOption = bestThirds.some((row) => isAllowed(slot, row) && !slots.some((item) => item.assignedTeamId === row.teamId));
    return hasOption ? [] : [`Partido ${slot.matchNo}`];
  });
  return { ok: false, blockedSlotLabels };
}

export function getThirdPlaceOptionState(slot: ThirdPlaceSlot, row: StandingRow, slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): { disabled: boolean; reason?: string } {
  if (!isAllowed(slot, row)) return { disabled: true, reason: `Grupo ${row.groupCode} no permitido en este cruce.` };
  if (slots.some((item) => item.slotId !== slot.slotId && item.assignedTeamId === row.teamId)) return { disabled: true, reason: 'Ya usado en otro cruce.' };
  const tentative = slots.map((item) => item.slotId === slot.slotId ? { ...item, assignedTeamId: row.teamId } : item);
  if (!validateThirdPlaceAssignmentSolvability(tentative, bestThirds).ok) return { disabled: false, reason: 'Bloquea otros cruces.' };
  return { disabled: false };
}
