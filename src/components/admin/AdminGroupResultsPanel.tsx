import type { Match, ScorePrediction, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { TeamIdentity } from '../ui/TeamIdentity';

export function AdminGroupResultsPanel({ matches, teams, results, onChange }: {
  matches: Match[];
  teams: Team[];
  results: ScorePrediction[];
  onChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
}) {
  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const home = teams.find((team) => team.id === match.homeTeamId);
        const away = teams.find((team) => team.id === match.awayTeamId);
        const result = results.find((item) => item.matchId === match.id);
        const isSaved = result?.homeScore !== null && result?.homeScore !== undefined && result?.awayScore !== null && result?.awayScore !== undefined;
        return (
          <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 text-xs font-bold text-white/45">
              <div>
                <span className="block">Partido {match.matchNo} - Grupo {match.groupCode}</span>
                <span className="mt-1 block break-words">{match.venue}</span>
              </div>
              <Badge tone={isSaved ? 'green' : 'slate'}>{isSaved ? 'Guardado mock' : 'Pendiente'}</Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] lg:items-center">
              <div className="min-w-0 rounded-2xl bg-white/10 px-3 py-2 lg:justify-self-end">
                <TeamIdentity team={home} label="Equipo local" align="right" />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2">
                <Input
                  aria-label="Goles local"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  value={result?.homeScore ?? ''}
                  onChange={(event) => onChange(match.id, event.target.value === '' ? null : Number(event.target.value), result?.awayScore ?? null)}
                  className="h-14 text-center text-2xl font-black"
                />
                <span className="text-center text-white/35">-</span>
                <Input
                  aria-label="Goles visitante"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  value={result?.awayScore ?? ''}
                  onChange={(event) => onChange(match.id, result?.homeScore ?? null, event.target.value === '' ? null : Number(event.target.value))}
                  className="h-14 text-center text-2xl font-black"
                />
              </div>

              <div className="min-w-0 rounded-2xl bg-white/10 px-3 py-2">
                <TeamIdentity team={away} label="Equipo visitante" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
