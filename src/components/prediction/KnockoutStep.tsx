import { ArrowLeft, ListChecks } from 'lucide-react';
import type { PredictedBracketMatch } from '../../types/prediction';
import type { Team } from '../../types/tournament';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { KnockoutBracket } from './KnockoutBracket';

export function KnockoutStep({ matches, teams, disabled, onBackToGroups, onChange }: {
  matches: PredictedBracketMatch[];
  teams: Team[];
  disabled?: boolean;
  onBackToGroups: () => void;
  onChange: (matchId: string, home: number | null, away: number | null, advancingTeamId?: string | null) => void;
}) {
  if (!matches.length) {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Eliminatorias</p>
            <h2 className="text-2xl font-semibold text-corex-ink">Primero construye los dieciseisavos</h2>
            <p className="mt-2 text-sm text-corex-ink/60">Completa grupos y asigna los mejores terceros para habilitar el bracket.</p>
          </div>
          <Button variant="secondary" onClick={onBackToGroups} icon={<ArrowLeft size={17} />}>Volver a grupos</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-widest text-cup-blue">Eliminatorias</p><h2 className="text-2xl font-semibold text-corex-ink">Define quién avanza ronda por ronda</h2></div>
        <Button variant="secondary" onClick={onBackToGroups} icon={<ListChecks size={17} />}>Ajustar grupos</Button>
      </div>
      <KnockoutBracket matches={matches} teams={teams} disabled={disabled} onChange={onChange} />
    </div>
  );
}
