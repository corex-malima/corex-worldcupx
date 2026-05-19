import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudOff, Grid2X2, Loader2, Network, Sparkles, Trash2, Trophy } from 'lucide-react';
import { DEFAULT_DEADLINE_ISO, DEMO_AUTOFILL_ENABLED, USE_MOCKS } from '../../lib/constants';
import { randomGroupScore, randomKnockoutScore } from '../../lib/demoAutofill';
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

  // Ref que mantiene el bracket más actualizado para que el autofill pueda
  // leerlo después de las propagaciones (closures capturadas al click serían stale).
  const bracketRef = useRef(prediction.draft.bracketMatches);
  useEffect(() => {
    bracketRef.current = prediction.draft.bracketMatches;
  }, [prediction.draft.bracketMatches]);

  // DEMO: llena los 72 grupos + terceros + bracket + ganadores de un click.
  // Ronda por ronda con setTimeout para que la propagación (R32 → R16, etc.)
  // surta efecto antes de leer las siguientes rondas desde el ref.
  // Borrable junto con DEMO_AUTOFILL_ENABLED cuando se cierre el lanzamiento.
  function autofillDemo() {
    // 1) Grupos
    prediction.groupMatches.forEach((match) => {
      const [h, a] = randomGroupScore();
      prediction.setScore(match.id, h, a);
    });

    // 2) Esperar tick, asignar terceros y construir bracket inicial
    setTimeout(() => {
      prediction.autoAssignThirdPlaces();
      prediction.buildKnockoutBracket();
      // 3) Llenar bracket ronda por ronda (R32 → R16 → QF → SF → TP → F)
      const rounds = ['R32', 'R16', 'QF', 'SF', 'TP', 'F'] as const;
      let roundIdx = 0;
      const fillNextRound = () => {
        if (roundIdx >= rounds.length) {
          setTab('summary');
          return;
        }
        const round = rounds[roundIdx];
        roundIdx += 1;
        bracketRef.current
          .filter((m) => m.roundCode === round && m.homeTeamId && m.awayTeamId)
          .forEach((match) => {
            const [h, a] = randomKnockoutScore();
            const winnerId = h > a ? match.homeTeamId! : match.awayTeamId!;
            prediction.setKnockoutScore(match.id, h, a, winnerId);
          });
        // Esperar próximo tick para que la propagación llegue a la siguiente ronda
        setTimeout(fillNextRound, 80);
      };
      fillNextRound();
    }, 100);
  }

  // Limpieza de toda la predicción (botón permanente, no solo demo).
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
          {DEMO_AUTOFILL_ENABLED && !locked && (
            <Button variant="primary" onClick={autofillDemo} icon={<Sparkles size={15} />} title="DEMO: llena marcadores aleatorios en grupos + bracket + campeón">
              Autorrellenar (DEMO)
            </Button>
          )}
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
