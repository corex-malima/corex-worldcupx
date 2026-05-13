import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { ThirdPlaceSlot } from '../../types/prediction';
import type { Match, ScorePrediction, StandingRow, Team } from '../../types/tournament';
import { validateGroupStep, validateThirdPlaceAssignments } from '../../lib/predictionValidation';
import { Button } from '../ui/Button';
import { BestThirdsSummary } from './BestThirdsSummary';
import { GroupMatchCard } from './GroupMatchCard';
import { GroupStandingsPreview } from './GroupStandingsPreview';
import { ManualTieBreakerPanel } from './ManualTieBreakerPanel';
import { ThirdPlaceSlotAssignment } from './ThirdPlaceSlotAssignment';

export function GroupStageStep({ teams, matches, predictions, standings, bestThirds, thirdPlaceSlots, manualTieBreakers, groupsNeedingManualTieBreaker, disabled, onChange, onAssignThird, onAutoAssignThirds, onManualTieBreaker, onBuildBracket }: {
  teams: Team[];
  matches: Match[];
  predictions: ScorePrediction[];
  standings: StandingRow[];
  bestThirds: StandingRow[];
  thirdPlaceSlots: ThirdPlaceSlot[];
  manualTieBreakers: Record<string, string[]>;
  groupsNeedingManualTieBreaker: string[];
  disabled?: boolean;
  onChange: (matchId: string, home: number | null, away: number | null) => void;
  onAssignThird: (slotId: string, teamId: string | null) => void;
  onAutoAssignThirds: () => void;
  onManualTieBreaker: (groupCode: string, orderedTeamIds: string[]) => void;
  onBuildBracket: () => void;
}) {
  const groupCodes = Array.from(new Set(teams.map((team) => team.groupCode))).sort();
  const errors = [...validateGroupStep(matches, predictions, standings), ...validateThirdPlaceAssignments(thirdPlaceSlots, bestThirds)];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="space-y-4">
        {groupCodes.map((groupCode) => (
          <section key={groupCode} className="space-y-3">
            <h2 className="text-xl font-black text-white">Grupo {groupCode}</h2>
            {matches.filter((match) => match.groupCode === groupCode).map((match) => (
              <GroupMatchCard key={match.id} match={match} teams={teams} prediction={predictions.find((prediction) => prediction.matchId === match.id)} disabled={disabled} onChange={(home, away) => onChange(match.id, home, away)} />
            ))}
          </section>
        ))}
      </div>
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <ManualTieBreakerPanel groupCodes={groupsNeedingManualTieBreaker} standings={standings} teams={teams} manualTieBreakers={manualTieBreakers} disabled={disabled} onChange={onManualTieBreaker} />
        <BestThirdsSummary rows={bestThirds} teams={teams} />
        <ThirdPlaceSlotAssignment slots={thirdPlaceSlots} bestThirds={bestThirds} teams={teams} disabled={disabled} onAssign={onAssignThird} onAutoAssign={onAutoAssignThirds} />
        {errors.length > 0 && (
          <div className="rounded-2xl border border-cup-red/25 bg-cup-red/10 p-4 text-sm font-bold text-red-100">
            <AlertTriangle className="mb-2" />
            {errors[0]}
          </div>
        )}
        <Button className="w-full" disabled={disabled || errors.length > 0} onClick={onBuildBracket} icon={<ArrowRight size={17} />}>Continuar a eliminatorias</Button>
        <div className="space-y-3">
          {groupCodes.map((groupCode) => <GroupStandingsPreview key={groupCode} groupCode={groupCode} rows={standings.filter((row) => row.groupCode === groupCode)} teams={teams} />)}
        </div>
      </aside>
    </div>
  );
}
