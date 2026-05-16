import type { PredictedBracketMatch } from '../../types/prediction';
import type { Team } from '../../types/tournament';
import type { KnockoutSaveStatus } from '../prediction/KnockoutMatchCard';
import { KnockoutBracket } from '../prediction/KnockoutBracket';
import { Card } from '../ui/Card';

export function AdminKnockoutResultsPanel({ matches, teams, onChange, onSave, saveStatusByMatch, saveErrorByMatch, officialMatchIds }: {
  matches: PredictedBracketMatch[];
  teams: Team[];
  onChange: (matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) => void;
  onSave?: (matchId: string) => void | Promise<void>;
  saveStatusByMatch?: Record<string, KnockoutSaveStatus>;
  saveErrorByMatch?: Record<string, string>;
  officialMatchIds?: Set<string>;
}) {
  if (!matches.length) {
    return (
      <Card>
        <h3 className="text-xl font-black text-white">Cruces reales pendientes</h3>
        <p className="mt-2 text-sm text-white/60">Completa resultados de grupos y asigna terceros reales para construir dieciseisavos.</p>
      </Card>
    );
  }
  return (
    <KnockoutBracket
      matches={matches}
      teams={teams}
      onChange={onChange}
      onSave={onSave}
      saveStatusByMatch={saveStatusByMatch}
      saveErrorByMatch={saveErrorByMatch}
      officialMatchIds={officialMatchIds}
    />
  );
}
