import type { BracketMatch, Team } from '../../types/tournament';
import { BracketMatchCard } from './BracketMatchCard';

export function BracketRound({ title, matches, teams }: { title: string; matches: BracketMatch[]; teams: Team[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-widest text-white/50">{title}</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin lg:flex-col lg:overflow-visible">
        {matches.map((match) => <BracketMatchCard key={match.id} match={match} teams={teams} />)}
      </div>
    </div>
  );
}
