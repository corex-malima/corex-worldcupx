import { useState } from 'react';
import { CheckCircle2, CloudOff, Grid2X2, Loader2, Network, Trophy } from 'lucide-react';
import { DEFAULT_DEADLINE_ISO } from '../../lib/constants';
import { isPredictionLocked } from '../../lib/tournament';
import { usePrediction } from '../../hooks/usePrediction';
import { useTournamentFixture } from '../../hooks/useTournamentFixture';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GroupStageStep } from './GroupStageStep';
import { KnockoutStep } from './KnockoutStep';
import { PredictionLockBanner } from './PredictionLockBanner';
import { PredictionProgress } from './PredictionProgress';
import { PredictionSummaryStep } from './PredictionSummaryStep';

const tabs = [
  { key: 'groups', label: 'Grupos', icon: Grid2X2 },
  { key: 'bracket', label: 'Eliminatorias', icon: Network },
  { key: 'summary', label: 'Resumen', icon: Trophy }
] as const;

type Tab = typeof tabs[number]['key'];

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveStatusBadge({ hydrating, status, error }: { hydrating: boolean; status: AutoSaveStatus; error: string | null }) {
  if (hydrating) return <span className="inline-flex items-center gap-1 text-xs font-bold text-white/55"><Loader2 size={13} className="animate-spin" /> Cargando…</span>;
  if (status === 'saving') return <span className="inline-flex items-center gap-1 text-xs font-bold text-white/65"><Loader2 size={13} className="animate-spin" /> Guardando</span>;
  if (status === 'saved') return <span className="inline-flex items-center gap-1 text-xs font-bold text-cup-green"><CheckCircle2 size={13} /> Guardado</span>;
  if (status === 'error') return <span className="inline-flex items-center gap-1 text-xs font-bold text-cup-red" title={error ?? undefined}><CloudOff size={13} /> Error al guardar</span>;
  return null;
}

export function PredictionWizard({ ticketId, adminMode = false }: { ticketId: string; adminMode?: boolean }) {
  const [tab, setTab] = useState<Tab>('groups');
  const [errors, setErrors] = useState<string[]>([]);
  const { fixture } = useTournamentFixture();
  const prediction = usePrediction(ticketId, { teams: fixture.teams, matches: fixture.matches, adminMode });
  const locked = isPredictionLocked(DEFAULT_DEADLINE_ISO);

  function buildBracket() {
    const nextErrors = prediction.buildKnockoutBracket();
    setErrors(nextErrors);
    if (!nextErrors.length) setTab('bracket');
  }

  function autoAssignThirds() {
    const nextErrors = prediction.autoAssignThirdPlaces();
    setErrors(nextErrors);
  }

  async function submit() {
    const nextErrors = await prediction.submitPrediction();
    setErrors(nextErrors);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">{adminMode ? 'Modo TTHH · editando ticket' : `Ticket ${ticketId.slice(0, 8)}`}</p>
          <h1 className="text-3xl font-black text-white">{adminMode ? 'Cargar predicción del colaborador' : 'Tu predicción WorldCupX'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatusBadge hydrating={prediction.hydrating} status={prediction.autoSaveStatus} error={prediction.autoSaveError} />
          <Badge tone={locked ? 'red' : prediction.draft.status === 'submitted' ? 'green' : 'gold'}>{locked ? 'Solo lectura' : prediction.draft.status === 'submitted' ? 'Enviado' : 'Editable'}</Badge>
        </div>
      </div>

      <PredictionLockBanner locked={locked} submitted={prediction.draft.status === 'submitted'} />
      <PredictionProgress value={prediction.progress} />

      {errors.length > 0 && <div className="rounded-2xl border border-cup-red/30 bg-cup-red/10 p-4 text-sm font-bold text-red-100">{errors[0]}</div>}

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((item) => {
          const Icon = item.icon;
          return <Button key={item.key} variant={tab === item.key ? 'primary' : 'secondary'} onClick={() => setTab(item.key)} icon={<Icon size={17} />}>{item.label}</Button>;
        })}
      </div>

      {tab === 'groups' && (
        <GroupStageStep
          teams={prediction.teams}
          matches={prediction.groupMatches}
          predictions={prediction.predictions}
          standings={prediction.standings}
          bestThirds={prediction.qualified.bestThirds}
          thirdPlaceSlots={prediction.thirdPlaceSlots}
          manualTieBreakers={prediction.draft.manualTieBreakers}
          groupsNeedingManualTieBreaker={prediction.groupsNeedingManualTieBreaker}
          disabled={locked}
          onChange={prediction.setScore}
          onAssignThird={prediction.setThirdAssignment}
          onAutoAssignThirds={autoAssignThirds}
          onManualTieBreaker={prediction.setManualTieBreaker}
          onBuildBracket={buildBracket}
        />
      )}
      {tab === 'bracket' && <KnockoutStep matches={prediction.draft.bracketMatches} teams={prediction.teams} disabled={locked} onBackToGroups={() => setTab('groups')} onChange={prediction.setKnockoutScore} />}
      {tab === 'summary' && <PredictionSummaryStep ticketId={ticketId} ticketAlias={null} ownerName={null} draft={prediction.draft} teams={prediction.teams} matches={prediction.matches} thirdPlaceSlots={prediction.thirdPlaceSlots} summary={prediction.finalSummary} disabled={locked || prediction.saving} onSubmit={() => void submit()} />}
    </div>
  );
}
