import type { Match, ScorePrediction, Team } from '../../types/tournament';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Save } from 'lucide-react';

export function MatchScoreInput({ match, teams, prediction, disabled, onChange, onSave }: {
  match: Match;
  teams: Team[];
  prediction?: ScorePrediction;
  disabled?: boolean;
  onChange: (home: number | null, away: number | null) => void;
  onSave: () => void;
}) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const homeValue = prediction?.homeScore ?? '';
  const awayValue = prediction?.awayScore ?? '';

  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-white/45">
        <span>Partido {match.matchNo}</span>
        <span>{match.venue}</span>
      </div>
      <div className="grid grid-cols-[1fr_78px_30px_78px_1fr] items-center gap-2">
        <div className="text-right font-black text-white"><span className="mr-2 text-xl">{home?.flagEmoji}</span>{home?.name ?? match.homeSlot}</div>
        <Input aria-label="Goles local" type="number" inputMode="numeric" min={0} max={30} disabled={disabled} value={homeValue} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value), prediction?.awayScore ?? null)} className="text-center text-xl font-black" />
        <span className="text-center text-white/40">-</span>
        <Input aria-label="Goles visitante" type="number" inputMode="numeric" min={0} max={30} disabled={disabled} value={awayValue} onChange={(event) => onChange(prediction?.homeScore ?? null, event.target.value === '' ? null : Number(event.target.value))} className="text-center text-xl font-black" />
        <div className="font-black text-white"><span className="mr-2 text-xl">{away?.flagEmoji}</span>{away?.name ?? match.awaySlot}</div>
      </div>
      <Button className="mt-3 w-full" variant="secondary" disabled={disabled} onClick={onSave} icon={<Save size={16} />}>Guardar marcador</Button>
    </div>
  );
}
