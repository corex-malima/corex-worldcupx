import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudOff, Grid2X2, Loader2, Network, Trash2, Trophy } from 'lucide-react';
import { DEFAULT_DEADLINE_ISO, USE_MOCKS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
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
import { InfoButton } from '../ui/InfoButton';
import { help } from '../../lib/help/helpContent';

const tabs = [
  { key: 'groups', label: 'Grupos', icon: Grid2X2 },
  { key: 'bracket', label: 'Eliminatorias', icon: Network },
  { key: 'summary', label: 'Resumen', icon: Trophy }
] as const;

type Tab = typeof tabs[number]['key'];

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveStatusBadge({ hydrating, status, error }: { hydrating: boolean; status: AutoSaveStatus; error: string | null }) {
  if (hydrating) return <span className="inline-flex items-center gap-1 text-xs font-bold text-corex-ink/55"><Loader2 size={13} className="animate-spin" /> Cargando…</span>;
  if (status === 'saving') return <span className="inline-flex items-center gap-1 text-xs font-bold text-corex-ink/65"><Loader2 size={13} className="animate-spin" /> Guardando</span>;
  if (status === 'saved') return <span className="inline-flex items-center gap-1 text-xs font-bold text-cup-green"><CheckCircle2 size={13} /> Guardado</span>;
  if (status === 'error') return <span className="inline-flex items-center gap-1 text-xs font-bold text-cup-red" title={error ?? undefined}><CloudOff size={13} /> Error al guardar</span>;
  return null;
}

export function PredictionWizard({ ticketId, adminMode = false }: { ticketId: string; adminMode?: boolean }) {
  const [tab, setTab] = useState<Tab>('groups');
  const [errors, setErrors] = useState<string[]>([]);
  const [ticketMeta, setTicketMeta] = useState<{ alias: string; ownerName: string | null }>({ alias: '', ownerName: null });
  const { fixture } = useTournamentFixture();
  const prediction = usePrediction(ticketId, { teams: fixture.teams, matches: fixture.matches, adminMode });
  const locked = isPredictionLocked(DEFAULT_DEADLINE_ISO);

  // Auto-redirigir a 'summary' cuando el ticket abre y la predicción ya fue
  // enviada. Solo dispara una vez tras la hidratación inicial (luego el
  // usuario puede navegar libremente entre tabs).
  const didLandOnSummary = useRef(false);
  useEffect(() => {
    if (didLandOnSummary.current) return;
    if (prediction.hydrating) return;
    if (prediction.draft.status === 'submitted') {
      setTab('summary');
      didLandOnSummary.current = true;
    }
  }, [prediction.hydrating, prediction.draft.status]);

  // Carga alias amigable ("Ticket N") + ownerName para que el comprobante PDF
  // y el header del wizard muestren la info real en vez del UUID.
  useEffect(() => {
    let cancelled = false;
    if (USE_MOCKS || !supabase || !ticketId) return;
    (async () => {
      const { data } = await supabase
        .from('v_admin_tickets')
        .select('alias, person_name')
        .eq('id', ticketId)
        .maybeSingle();
      if (!cancelled && data) {
        setTicketMeta({
          alias: (data.alias as string) ?? '',
          ownerName: (data.person_name as string | null) ?? null
        });
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

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

  // Ref sincronizado con bracketMatches para que clearAll pueda iterar
  // sobre el bracket más reciente sin depender de closures stale.
  const bracketRef = useRef(prediction.draft.bracketMatches);
  useEffect(() => {
    bracketRef.current = prediction.draft.bracketMatches;
  }, [prediction.draft.bracketMatches]);

  // Limpieza de toda la predicción (botón permanente).
  function clearAll() {
    if (!window.confirm('¿Vaciar TODOS los marcadores y selecciones de esta predicción? No se puede deshacer.')) return;
    // Grupos
    prediction.groupMatches.forEach((match) => {
      prediction.setScore(match.id, null, null);
    });
    // Terceros
    prediction.thirdPlaceSlots.forEach((slot) => {
      prediction.setThirdAssignment(slot.slotId, null);
    });
    // Bracket: limpiar scores y ganadores (los teams se quedan, son inferidos)
    bracketRef.current.forEach((match) => {
      prediction.setKnockoutScore(match.id, null, null, null);
    });
    setTab('groups');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">{adminMode ? `Modo TTHH · ${ticketMeta.alias || 'editando ticket'}` : (ticketMeta.alias || `Ticket ${ticketId.slice(0, 8)}`)}</p>
          <h1 className="text-3xl font-semibold text-corex-ink">
            {adminMode ? 'Cargar predicción del colaborador' : 'Tu predicción WorldCupX'}
            <InfoButton title={help.deadline.title} className="ml-2 align-middle">{help.deadline.body}</InfoButton>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!locked && (
            <Button variant="danger" onClick={clearAll} icon={<Trash2 size={15} />} title="Vaciar TODA la predicción (grupos + terceros + bracket)">
              Vaciar
            </Button>
          )}
          <SaveStatusBadge hydrating={prediction.hydrating} status={prediction.autoSaveStatus} error={prediction.autoSaveError} />
          <Badge tone={locked ? 'red' : prediction.draft.status === 'submitted' ? 'green' : 'gold'}>{locked ? 'Solo lectura' : prediction.draft.status === 'submitted' ? 'Enviado' : 'Editable'}</Badge>
        </div>
      </div>

      <PredictionLockBanner locked={locked} submitted={prediction.draft.status === 'submitted'} />
      <PredictionProgress value={prediction.progress} />

      {errors.length > 0 && <div className="rounded-2xl border border-cup-red/30 bg-cup-red/10 p-4 text-sm font-bold text-cup-red">{errors[0]}</div>}

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((item) => {
          const Icon = item.icon;
          return <Button key={item.key} variant={tab === item.key ? 'primary' : 'secondary'} onClick={() => setTab(item.key)} icon={<Icon size={17} />}>{item.label}</Button>;
        })}
        <InfoButton
          title={tab === 'groups' ? help.predictionGroups.title : tab === 'bracket' ? help.predictionKnockout.title : help.predictionSummary.title}
        >
          {tab === 'groups' ? help.predictionGroups.body : tab === 'bracket' ? help.predictionKnockout.body : help.predictionSummary.body}
        </InfoButton>
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
      {tab === 'summary' && <PredictionSummaryStep ticketId={ticketId} ticketAlias={ticketMeta.alias} ownerName={ticketMeta.ownerName} draft={prediction.draft} teams={prediction.teams} matches={prediction.matches} thirdPlaceSlots={prediction.thirdPlaceSlots} summary={prediction.finalSummary} disabled={locked || prediction.saving} onSubmit={() => void submit()} />}
    </div>
  );
}
