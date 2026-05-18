import type { StandingRow, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';
import { TeamIdentity } from '../ui/TeamIdentity';

export function GroupStandingsPreview({ groupCode, rows, teams }: { groupCode: string; rows: StandingRow[]; teams: Team[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-corex-ink/10 bg-corex-fog">
      <div className="flex items-center justify-between bg-pitch-800 px-4 py-3">
        <h3 className="font-semibold text-corex-ink">Grupo {groupCode}</h3>
        <Badge tone="blue">Top 3 visible</Badge>
      </div>
      <table className="w-full text-sm">
        <thead className="text-corex-ink/45">
          <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const team = teams.find((item) => item.id === row.teamId);
            return (
              <tr key={row.teamId} className="border-t border-corex-ink/10 text-corex-ink/80">
                <td className="p-3 font-black">{row.position}</td>
                <td className="min-w-0 p-3 font-bold">
                  <TeamIdentity team={team} size="sm" />
                  {row.tieStatus && row.tieStatus !== 'clear' && (
                    <p className={`mt-1 text-[11px] font-bold ${row.tieStatus === 'needs_manual' ? 'text-cup-red' : 'text-cup-blue'}`}>
                      {row.tieBreakerReason}
                    </p>
                  )}
                </td>
                <td className="text-center font-black">{row.points}</td>
                <td className="text-center">{row.goalDifference}</td>
                <td className="text-center">{row.goalsFor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
