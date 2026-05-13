import type { StandingRow, Team } from '../../types/tournament';
import { getGroupsNeedingManualTieBreaker } from '../../lib/standings';
import { TeamIdentity } from '../ui/TeamIdentity';
import { ManualTieBreakerPanel } from '../prediction/ManualTieBreakerPanel';

export function AdminTieBreakersPanel({ standings, teams, fairPlayPoints, manualTieBreakers, onFairPlayChange, onManualTieBreaker }: {
  standings: StandingRow[];
  teams: Team[];
  fairPlayPoints: Record<string, number>;
  manualTieBreakers: Record<string, string[]>;
  onFairPlayChange: (teamId: string, points: number | null) => void;
  onManualTieBreaker: (groupCode: string, orderedTeamIds: string[]) => void;
}) {
  const groupsWithCompleteResults = new Set(
    Array.from(new Set(standings.map((row) => row.groupCode)))
      .filter((groupCode) => standings.filter((row) => row.groupCode === groupCode).every((row) => row.played === 3))
  );
  const pendingGroups = getGroupsNeedingManualTieBreaker(standings).filter((groupCode) => groupsWithCompleteResults.has(groupCode));
  if (!pendingGroups.length) {
    return (
      <div className="rounded-2xl border border-cup-green/25 bg-pitch-900 p-4 text-sm font-bold text-green-100">
        No hay desempates pendientes por fair play o sorteo/manual.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-pitch-900 p-4">
        <h3 className="font-black text-white">Fair play real</h3>
        <p className="mt-1 text-sm text-white/65">Ingresa puntos de indisciplina solo para equipos empatados. Menor puntaje gana el desempate.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {standings.filter((row) => pendingGroups.includes(row.groupCode)).map((row) => {
            const team = teams.find((item) => item.id === row.teamId);
            return (
              <label key={row.teamId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-pitch-900 p-3">
                <TeamIdentity team={team} size="sm" />
                <input
                  type="number"
                  min={0}
                  value={fairPlayPoints[row.teamId] ?? ''}
                  onChange={(event) => onFairPlayChange(row.teamId, event.target.value === '' ? null : Number(event.target.value))}
                  className="h-11 w-24 rounded-xl border border-white/10 bg-pitch-900 px-3 text-center font-black text-white outline-none focus:border-cup-blue"
                  placeholder="FP"
                />
              </label>
            );
          })}
        </div>
      </div>
      <ManualTieBreakerPanel groupCodes={pendingGroups} standings={standings} teams={teams} manualTieBreakers={manualTieBreakers} onChange={onManualTieBreaker} />
    </div>
  );
}
