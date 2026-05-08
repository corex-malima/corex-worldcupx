import { Swords } from 'lucide-react';
import type { BracketMatch, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';

export function BracketMatchCard({ match, teams }: { match: BracketMatch; teams: Team[] }) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const winner = teams.find((team) => team.id === match.winnerTeamId);
  return (
    <div className="min-w-64 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-bold text-white/45"><span>{match.matchNo ? `Partido ${match.matchNo}` : match.id}</span><Swords size={15} /></div>
      <div className="space-y-2">
        <div className="rounded-2xl bg-white/10 px-3 py-2 font-bold text-white">{home ? `${home.flagEmoji} ${home.name}` : match.homeSlot ?? 'Slot pendiente'}</div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 font-bold text-white">{away ? `${away.flagEmoji} ${away.name}` : match.awaySlot ?? 'Slot pendiente'}</div>
      </div>
      {match.venue && <p className="mt-3 text-xs font-bold text-white/45">{match.venue}</p>}
      <div className="mt-3">{winner ? <Badge tone="green">Pasa {winner.name}</Badge> : <Badge>Por definir</Badge>}</div>
    </div>
  );
}
