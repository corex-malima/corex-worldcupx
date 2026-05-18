import { Wand2 } from 'lucide-react';
import type { ThirdPlaceSlot } from '../../types/prediction';
import type { StandingRow, Team } from '../../types/tournament';
import { getThirdPlaceOptionState, validateThirdPlaceAssignmentSolvability } from '../../lib/thirdPlaceAssignment';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TeamIdentity } from '../ui/TeamIdentity';

export function ThirdPlaceSlotAssignment({ slots, bestThirds, teams, disabled, onAssign, onAutoAssign }: {
  slots: ThirdPlaceSlot[];
  bestThirds: StandingRow[];
  teams: Team[];
  disabled?: boolean;
  onAssign: (slotId: string, teamId: string | null) => void;
  onAutoAssign?: () => void;
}) {
  const hasEnoughThirds = bestThirds.length >= slots.length;
  const solvability = hasEnoughThirds ? validateThirdPlaceAssignmentSolvability(slots, bestThirds) : { ok: true, blockedSlotLabels: [] };

  return (
    <div className="rounded-2xl border border-corex-ink/10 bg-pitch-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-corex-ink">Asignacion manual de terceros</h3>
          <p className="text-sm text-corex-ink/60">Cada cruce respeta los grupos permitidos. Puedes autocompletar una combinacion valida.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={solvability.ok ? 'blue' : 'red'}>{slots.filter((slot) => slot.assignedTeamId).length}/{slots.length}</Badge>
          {onAutoAssign && (
            <Button type="button" variant="secondary" className="min-h-9 rounded-xl px-3 text-xs" disabled={disabled} onClick={onAutoAssign} icon={<Wand2 size={14} />}>
              Asignar automaticamente
            </Button>
          )}
        </div>
      </div>
      {!hasEnoughThirds && (
        <div className="mb-3 rounded-xl border border-corex-ink/10 bg-corex-fog p-3 text-sm font-bold text-corex-ink/60">
          Completa todos los grupos para calcular los mejores terceros.
        </div>
      )}
      {!solvability.ok && (
        <div className="mb-3 rounded-xl border border-cup-red/30 bg-cup-red/10 p-3 text-sm font-bold text-cup-red">
          Esta asignacion deja cruces sin terceros validos{solvability.blockedSlotLabels.length ? `: ${solvability.blockedSlotLabels.join(', ')}` : ''}.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot) => {
          const selectedIds = new Set(slots.flatMap((item) => (item.slotId !== slot.slotId && item.assignedTeamId) ? [item.assignedTeamId] : []));
          const assignedTeam = teams.find((team) => team.id === slot.assignedTeamId);
          return (
            <label key={slot.slotId} className="block min-w-0 rounded-2xl border border-corex-ink/10 bg-pitch-900 p-3">
              <span className="block text-xs font-black uppercase tracking-widest text-corex-ink/45">Partido {slot.matchNo}</span>
              <span className="mt-1 block text-sm font-black text-corex-ink">{slot.label}</span>
              <span className="mt-1 block text-xs font-bold text-cup-blue">
                Permitidos: {slot.allowedGroupCodes?.length ? slot.allowedGroupCodes.join('/') : 'Todos'}
              </span>
              <select
                disabled={disabled}
                value={slot.assignedTeamId ?? ''}
                onChange={(event) => onAssign(slot.slotId, event.target.value || null)}
                className="mt-3 min-h-12 w-full rounded-2xl border border-corex-ink/10 bg-pitch-900 px-3 text-corex-ink outline-none focus:border-cup-blue"
              >
                <option value="">Seleccionar tercero</option>
                {bestThirds.map((row) => {
                  const team = teams.find((item) => item.id === row.teamId);
                  const state = getThirdPlaceOptionState(slot, row, slots, bestThirds);
                  const optionDisabled = selectedIds.has(row.teamId) || state.disabled;
                  return (
                    <option key={row.teamId} value={row.teamId} disabled={optionDisabled}>
                      {team?.name} - Grupo {row.groupCode}{state.reason ? ` (${state.reason})` : ''}
                    </option>
                  );
                })}
              </select>
              <div className="mt-2 flex flex-wrap gap-1">
                {bestThirds.map((row) => {
                  const team = teams.find((item) => item.id === row.teamId);
                  const state = getThirdPlaceOptionState(slot, row, slots, bestThirds);
                  if (!state.disabled) return null;
                  return <span key={row.teamId} className="rounded-full bg-corex-fog px-2 py-1 text-[11px] font-bold text-corex-ink/45">{team?.fifaCode ?? row.groupCode}: {state.reason}</span>;
                })}
              </div>
              {assignedTeam && <TeamIdentity team={assignedTeam} size="sm" className="mt-3 rounded-xl bg-corex-fog px-3 py-2" />}
            </label>
          );
        })}
      </div>
    </div>
  );
}
