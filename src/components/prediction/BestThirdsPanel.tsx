import type { StandingRow, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';

export function BestThirdsPanel({ rows, teams }: { rows: StandingRow[]; teams: Team[] }) {
  return (
    <div className="rounded-3xl border border-cup-blue/25 bg-cup-blue/10 p-4">
      <h3 className="font-black text-white">Mejores terceros</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.length === 0 && <p className="text-sm text-white/55">Completa marcadores para calcular mejores terceros.</p>}
        {rows.map((row) => {
          const team = teams.find((item) => item.id === row.teamId);
          return <Badge key={row.teamId} tone="blue">{team?.flagEmoji} {team?.name} · {row.points} pts</Badge>;
        })}
      </div>
    </div>
  );
}
