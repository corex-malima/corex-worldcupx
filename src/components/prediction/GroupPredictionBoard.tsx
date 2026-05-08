import type { Match, ScorePrediction, StandingRow, Team } from '../../types/tournament';
import { MatchScoreInput } from './MatchScoreInput';
import { GroupStandingsTable } from './GroupStandingsTable';

export function GroupPredictionBoard({ teams, matches, predictions, standings, disabled, onChange, onSave }: {
  teams: Team[];
  matches: Match[];
  predictions: ScorePrediction[];
  standings: StandingRow[];
  disabled?: boolean;
  onChange: (matchId: string, home: number | null, away: number | null) => void;
  onSave: (matchId: string) => void;
}) {
  const groupCodes = Array.from(new Set(teams.map((team) => team.groupCode))).sort();
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <div className="space-y-4">
        {matches.filter((match) => match.stage === 'GROUP').map((match) => (
          <MatchScoreInput
            key={match.id}
            match={match}
            teams={teams}
            prediction={predictions.find((prediction) => prediction.matchId === match.id)}
            disabled={disabled}
            onChange={(home, away) => onChange(match.id, home, away)}
            onSave={() => onSave(match.id)}
          />
        ))}
      </div>
      <div className="space-y-4">
        {groupCodes.map((groupCode) => (
          <GroupStandingsTable key={groupCode} groupCode={groupCode} rows={standings.filter((row) => row.groupCode === groupCode)} teams={teams} />
        ))}
      </div>
    </div>
  );
}
