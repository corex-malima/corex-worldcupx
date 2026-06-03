import type { Match, ScorePrediction, Team } from '../../types/tournament';
import { Input } from '../ui/Input';
import { TeamIdentity } from '../ui/TeamIdentity';

export function GroupMatchCard({ match, teams, prediction, disabled, onChange }: {
  match: Match;
  teams: Team[];
  prediction?: ScorePrediction;
  disabled?: boolean;
  onChange: (home: number | null, away: number | null) => void;
}) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const homeValue = prediction?.homeScore ?? '';
  const awayValue = prediction?.awayScore ?? '';

  return (
    <div className="rounded-2xl border border-corex-ink/10 bg-pitch-900 p-4 transition hover:bg-pitch-900">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 text-xs font-bold text-corex-ink/45">
        <span>Partido {match.matchNo} - Grupo {match.groupCode}</span>
        <span className="break-words text-right">{match.venue}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0 rounded-2xl bg-pitch-800 px-3 py-2 lg:justify-self-end">
          <TeamIdentity team={home} label="Equipo local" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2">
          <Input aria-label="Goles local" type="number" inputMode="numeric" min={0} max={30} disabled={disabled} value={homeValue} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value), prediction?.awayScore ?? null)} className="h-14 text-center text-2xl font-black" />
          <span className="text-center text-corex-ink/35">-</span>
          <Input aria-label="Goles visitante" type="number" inputMode="numeric" min={0} max={30} disabled={disabled} value={awayValue} onChange={(event) => onChange(prediction?.homeScore ?? null, event.target.value === '' ? null : Number(event.target.value))} className="h-14 text-center text-2xl font-black" />
        </div>
        <div className="min-w-0 rounded-2xl bg-pitch-800 px-3 py-2">
          <TeamIdentity team={away} label="Equipo visitante" />
        </div>
      </div>
    </div>
  );
}
