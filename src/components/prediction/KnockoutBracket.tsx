import type { PredictedBracketMatch, RoundCode } from '../../types/prediction';
import type { Team } from '../../types/tournament';
import { KnockoutMatchCard, type KnockoutSaveStatus } from './KnockoutMatchCard';

const rounds: Array<[RoundCode, string]> = [
  ['R32', 'Dieciseisavos'],
  ['R16', 'Octavos'],
  ['QF', 'Cuartos'],
  ['SF', 'Semis'],
  ['THIRD_PLACE', 'Tercer/cuarto puesto'],
  ['FINAL', 'Final']
];

interface Props {
  matches: PredictedBracketMatch[];
  teams: Team[];
  disabled?: boolean;
  onChange: (matchId: string, home: number | null, away: number | null, advancingTeamId?: string | null) => void;
  /** Modo admin: muestra botón Guardar por partido */
  onSave?: (matchId: string) => void | Promise<void>;
  saveStatusByMatch?: Record<string, KnockoutSaveStatus>;
  saveErrorByMatch?: Record<string, string>;
  officialMatchIds?: Set<string>;
}

export function KnockoutBracket({ matches, teams, disabled, onChange, onSave, saveStatusByMatch, saveErrorByMatch, officialMatchIds }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-950/40 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {rounds.map(([roundCode, title]) => (
          <section key={roundCode} className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/50">{title}</h3>
            {matches.filter((match) => match.roundCode === roundCode).map((match) => (
              <KnockoutMatchCard
                key={match.id}
                match={match}
                teams={teams}
                disabled={disabled}
                onChange={onChange}
                onSave={onSave}
                saveStatus={saveStatusByMatch?.[match.id]}
                saveError={saveErrorByMatch?.[match.id]}
                isOfficial={officialMatchIds?.has(match.id)}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
