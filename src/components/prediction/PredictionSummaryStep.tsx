import { CheckCircle2, Trophy } from 'lucide-react';
import type { FinalPredictionSummary, PredictionDraft } from '../../types/prediction';
import type { Team } from '../../types/tournament';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TeamIdentity } from '../ui/TeamIdentity';

function findTeam(teams: Team[], teamId: string | null) {
  return teams.find((item) => item.id === teamId);
}

function TeamLine({ label, team }: { label: string; team?: Team }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-pitch-800 px-3 py-2">
      <span className="shrink-0 text-sm font-bold text-white/55">{label}</span>
      <TeamIdentity team={team} label="Pendiente" align="right" />
    </div>
  );
}

export function PredictionSummaryStep({ ticketId, draft, teams, summary, disabled, onSubmit }: { ticketId: string; draft: PredictionDraft; teams: Team[]; summary: FinalPredictionSummary; disabled?: boolean; onSubmit: () => void }) {
  const champion = findTeam(teams, summary.championTeamId);

  return (
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <Card>
        <Trophy className="mb-4 text-cup-blue" size={42} />
        <p className="text-xs font-black uppercase tracking-widest text-white/45">Ticket {ticketId}</p>
        <div className="mt-2">
          <p className="text-sm font-black uppercase tracking-widest text-cup-blue">Campeón</p>
          <TeamIdentity team={champion} label="Pendiente" size="lg" className="mt-2 text-2xl" />
        </div>
        <div className="mt-4 space-y-2">
          <TeamLine label="Subcampeón" team={findTeam(teams, summary.runnerUpTeamId)} />
          <TeamLine label="Tercer lugar" team={findTeam(teams, summary.thirdPlaceTeamId)} />
          <TeamLine label="Cuarto lugar" team={findTeam(teams, summary.fourthPlaceTeamId)} />
          <p className="px-1 text-sm text-white/65"><b>Estado:</b> {draft.status}</p>
        </div>
        <Button className="mt-5 w-full" disabled={disabled || !summary.championTeamId} onClick={onSubmit} icon={<CheckCircle2 size={17} />}>{draft.status === 'submitted' ? 'Reenviar predicción' : 'Enviar predicción'}</Button>
      </Card>
      <Card>
        <h3 className="text-xl font-black text-white">Predicción completa</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {draft.bracketMatches.filter((match) => match.advancingTeamId).map((match) => (
            <div key={match.id} className="min-w-0 rounded-2xl bg-pitch-800 p-3 text-sm text-white/75">
              <b>Partido {match.matchNo}</b>
              <TeamIdentity team={findTeam(teams, match.advancingTeamId)} label="Pendiente" size="sm" className="mt-2" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
