import type { PredictedBracketMatch, RoundCode } from '../../types/prediction';
import type { Team } from '../../types/tournament';
import { KnockoutMatchCard } from './KnockoutMatchCard';

const rounds: Array<[RoundCode, string]> = [
  ['R32', 'Dieciseisavos'],
  ['R16', 'Octavos'],
  ['QF', 'Cuartos'],
  ['SF', 'Semis'],
  ['THIRD_PLACE', 'Tercer/cuarto puesto'],
  ['FINAL', 'Final']
];

export function KnockoutBracket({ matches, teams, disabled, onChange }: { matches: PredictedBracketMatch[]; teams: Team[]; disabled?: boolean; onChange: (matchId: string, home: number | null, away: number | null, advancingTeamId?: string | null) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {rounds.map(([roundCode, title]) => (
          <section key={roundCode} className="min-w-0 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/50">{title}</h3>
            {matches.filter((match) => match.roundCode === roundCode).map((match) => <KnockoutMatchCard key={match.id} match={match} teams={teams} disabled={disabled} onChange={onChange} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
