import { useState } from 'react';
import type { Match, Team } from '../../types/tournament';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function ActualResultForm({ match, teams }: { match: Match; teams: Team[] }) {
  const [home, setHome] = useState(match.homeScore ?? '');
  const [away, setAway] = useState(match.awayScore ?? '');
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-bold text-white/45">Partido {match.matchNo}</p>
      <div className="mt-3 grid grid-cols-[1fr_80px_80px_auto] items-end gap-3">
        <div className="font-black text-white">{homeTeam?.flagEmoji} {homeTeam?.name} vs {awayTeam?.flagEmoji} {awayTeam?.name}</div>
        <Input type="number" value={home} onChange={(event) => setHome(event.target.value)} />
        <Input type="number" value={away} onChange={(event) => setAway(event.target.value)} />
        <Button>Guardar</Button>
      </div>
    </div>
  );
}
