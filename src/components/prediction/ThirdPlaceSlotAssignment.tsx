import type { ThirdPlaceSlot } from '../../types/prediction';
import type { StandingRow, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';
import { TeamIdentity } from '../ui/TeamIdentity';

export function ThirdPlaceSlotAssignment({ slots, bestThirds, teams, disabled, onAssign }: {
  slots: ThirdPlaceSlot[];
  bestThirds: StandingRow[];
  teams: Team[];
  disabled?: boolean;
  onAssign: (slotId: string, teamId: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-cup-gold/25 bg-cup-gold/10 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-white">Asignación manual de terceros</h3>
          <p className="text-sm text-white/60">Versión base configurable. Se puede reemplazar por matriz oficial luego.</p>
        </div>
        <Badge tone="gold">{slots.filter((slot) => slot.assignedTeamId).length}/{slots.length}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot) => {
          const selectedIds = new Set(slots.filter((item) => item.slotId !== slot.slotId).map((item) => item.assignedTeamId).filter(Boolean));
          const allowedRows = bestThirds.filter((row) => !slot.allowedGroupCodes?.length || slot.allowedGroupCodes.includes(row.groupCode));
          const assignedTeam = teams.find((team) => team.id === slot.assignedTeamId);
          return (
            <label key={slot.slotId} className="block min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <span className="block text-xs font-black uppercase tracking-widest text-white/45">Partido {slot.matchNo}</span>
              <span className="mt-1 block truncate text-sm font-black text-white">{slot.label}</span>
              <span className="mt-1 block text-xs font-bold text-cup-gold/80">
                Permitidos: {slot.allowedGroupCodes?.length ? slot.allowedGroupCodes.join('/') : 'Todos'}
              </span>
              <select
                disabled={disabled}
                value={slot.assignedTeamId ?? ''}
                onChange={(event) => onAssign(slot.slotId, event.target.value || null)}
                className="mt-3 min-h-12 w-full rounded-2xl border border-white/10 bg-pitch-900 px-3 text-white outline-none focus:border-cup-gold"
              >
                <option value="">Seleccionar tercero</option>
                {allowedRows.map((row) => {
                  const team = teams.find((item) => item.id === row.teamId);
                  return <option key={row.teamId} value={row.teamId} disabled={selectedIds.has(row.teamId)}>{team?.name} - Grupo {row.groupCode}</option>;
                })}
              </select>
              {assignedTeam && <TeamIdentity team={assignedTeam} size="sm" className="mt-3 rounded-xl bg-black/20 px-3 py-2" />}
            </label>
          );
        })}
      </div>
    </div>
  );
}
