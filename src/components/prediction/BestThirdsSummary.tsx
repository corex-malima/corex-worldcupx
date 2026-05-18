import type { StandingRow, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';
import { TeamIdentity } from '../ui/TeamIdentity';

export function BestThirdsSummary({ rows, teams }: { rows: StandingRow[]; teams: Team[] }) {
  return (
    <div className="rounded-2xl border border-corex-ink/10 bg-pitch-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-corex-ink">Mejores terceros</h3>
        <Badge tone="blue">{rows.length}/8</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => {
          const team = teams.find((item) => item.id === row.teamId);
          return (
            <div key={row.teamId} className="flex min-w-0 items-center gap-2 rounded-full border border-corex-ink/10 bg-pitch-800 px-3 py-2 text-xs font-black text-corex-ink">
              <TeamIdentity team={team} size="sm" className="max-w-40" />
              <span className="shrink-0 text-corex-ink/65">{row.points} pts</span>
              <span className="shrink-0 text-corex-ink/45">DG {row.goalDifference}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
