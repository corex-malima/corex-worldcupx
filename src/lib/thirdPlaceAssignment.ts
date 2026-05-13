import type { ThirdPlaceSlot } from '../types/prediction';
import type { StandingRow } from '../types/tournament';

function isAllowed(slot: ThirdPlaceSlot, row: StandingRow): boolean {
  return !slot.allowedGroupCodes?.length || slot.allowedGroupCodes.includes(row.groupCode);
}

function search(slots: ThirdPlaceSlot[], candidates: StandingRow[], fixed = new Map<string, string | null>()): ThirdPlaceSlot[] | null {
  const fixedValues = Array.from(fixed.values()).filter(Boolean) as string[];
  if (new Set(fixedValues).size !== fixedValues.length) return null;
  const used = new Set(fixedValues);
  const orderedSlots = [...slots].sort((a, b) => {
    const aFixed = fixed.has(a.slotId);
    const bFixed = fixed.has(b.slotId);
    if (aFixed !== bFixed) return aFixed ? -1 : 1;
    const aOptions = candidates.filter((row) => !used.has(row.teamId) && isAllowed(a, row)).length;
    const bOptions = candidates.filter((row) => !used.has(row.teamId) && isAllowed(b, row)).length;
    return aOptions - bOptions || a.order - b.order;
  });
  const assigned = new Map<string, string | null>(fixed);

  function backtrack(index: number): boolean {
    if (index >= orderedSlots.length) return true;
    const slot = orderedSlots[index];
    const fixedTeamId = assigned.get(slot.slotId);
    if (fixedTeamId) {
      const fixedRow = candidates.find((row) => row.teamId === fixedTeamId);
      if (!fixedRow || !isAllowed(slot, fixedRow)) return false;
      return backtrack(index + 1);
    }

    const options = candidates.filter((row) => !used.has(row.teamId) && isAllowed(slot, row));
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

  const blockedSlotLabels = slots
    .filter((slot) => !slot.assignedTeamId)
    .filter((slot) => !bestThirds.some((row) => isAllowed(slot, row) && !slots.some((item) => item.assignedTeamId === row.teamId)))
    .map((slot) => `Partido ${slot.matchNo}`);
  return { ok: false, blockedSlotLabels };
}

export function getThirdPlaceOptionState(slot: ThirdPlaceSlot, row: StandingRow, slots: ThirdPlaceSlot[], bestThirds: StandingRow[]): { disabled: boolean; reason?: string } {
  if (!isAllowed(slot, row)) return { disabled: true, reason: `Grupo ${row.groupCode} no permitido en este cruce.` };
  if (slots.some((item) => item.slotId !== slot.slotId && item.assignedTeamId === row.teamId)) return { disabled: true, reason: 'Ya usado en otro cruce.' };
  const tentative = slots.map((item) => item.slotId === slot.slotId ? { ...item, assignedTeamId: row.teamId } : item);
  if (!validateThirdPlaceAssignmentSolvability(tentative, bestThirds).ok) return { disabled: false, reason: 'Bloquea otros cruces.' };
  return { disabled: false };
}
