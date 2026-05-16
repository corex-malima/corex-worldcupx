import { Shuffle } from 'lucide-react';
import type { StandingRow, Team } from '../../types/tournament';
import { TeamIdentity } from '../ui/TeamIdentity';

export function ManualTieBreakerPanel({ groupCodes, standings, teams, manualTieBreakers, disabled, onChange }: {
  groupCodes: string[];
  standings: StandingRow[];
  teams: Team[];
  manualTieBreakers: Record<string, string[]>;
  disabled?: boolean;
  onChange: (groupCode: string, orderedTeamIds: string[]) => void;
}) {
  if (!groupCodes.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl border border-cup-blue/25 bg-pitch-800 p-2 text-cup-blue"><Shuffle size={18} /></div>
        <div>
          <h3 className="font-semibold text-white">Resolver desempates</h3>
          <p className="text-sm text-white/65">El empate llega a fair play o sorteo. Elige el orden final para poder construir eliminatorias.</p>
        </div>
      </div>
      <div className="space-y-3">
        {groupCodes.map((groupCode) => {
          const tiedRows = standings.filter((row) => row.groupCode === groupCode && row.tieStatus === 'needs_manual');
          const currentOrder = manualTieBreakers[groupCode]?.filter((teamId) => tiedRows.some((row) => row.teamId === teamId));
          const ordered = currentOrder?.length === tiedRows.length ? currentOrder : tiedRows.map((row) => row.teamId);

          function setPosition(position: number, teamId: string) {
            const next = [...ordered];
            const previousIndex = next.indexOf(teamId);
            if (previousIndex >= 0) next[previousIndex] = next[position];
            next[position] = teamId;
            onChange(groupCode, next);
          }

          return (
            <div key={groupCode} className="rounded-2xl border border-white/10 bg-pitch-900 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-white">Grupo {groupCode}</p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(groupCode, tiedRows.map((row) => row.teamId))}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/70 hover:bg-pitch-800 disabled:opacity-50"
                >
                  Usar orden visible
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ordered.map((teamId, index) => {
                  const team = teams.find((item) => item.id === teamId);
                  return (
                    <label key={`${groupCode}-${teamId}`} className="space-y-2 rounded-xl bg-pitch-950/40 p-3">
                      <span className="text-xs font-black uppercase tracking-widest text-white/45">Posicion {tiedRows[0]?.position + index}</span>
                      <select
                        disabled={disabled}
                        value={teamId}
                        onChange={(event) => setPosition(index, event.target.value)}
                        className="min-h-11 w-full rounded-xl border border-white/10 bg-pitch-900 px-3 text-white outline-none focus:border-cup-blue"
                      >
                        {tiedRows.map((row) => {
                          const optionTeam = teams.find((item) => item.id === row.teamId);
                          return <option key={row.teamId} value={row.teamId}>{optionTeam?.name ?? row.teamId}</option>;
                        })}
                      </select>
                      <TeamIdentity team={team} size="sm" />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
