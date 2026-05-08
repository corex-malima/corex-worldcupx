import type { BracketMatch, Team } from '../../types/tournament';
import { BracketRound } from './BracketRound';

export function BracketBoard({ teams, matches }: { teams: Team[]; matches: BracketMatch[] }) {
  const stages = [
    ['R32', 'Dieciseisavos'],
    ['R16', 'Octavos'],
    ['QF', 'Cuartos'],
    ['SF', 'Semifinal'],
    ['FINAL', 'Final']
  ] as const;
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-black/10 p-4 scrollbar-thin">
      <div className="grid min-w-[900px] grid-cols-5 gap-5">
        {stages.map(([stage, title]) => <BracketRound key={stage} title={title} teams={teams} matches={matches.filter((match) => match.stage === stage)} />)}
      </div>
    </div>
  );
}
