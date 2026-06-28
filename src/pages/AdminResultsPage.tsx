import { Calculator, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useAdminKpis } from '../hooks/useAdminKpis';
import { useTournamentFixture } from '../hooks/useTournamentFixture';
import { useAdminResults, type AdminResultsTab } from '../hooks/useAdminResults';
import { AdminGroupResultsPanel } from '../components/admin/AdminGroupResultsPanel';
import { AdminGroupStandingsPanel } from '../components/admin/AdminGroupStandingsPanel';
import { AdminKnockoutResultsPanel } from '../components/admin/AdminKnockoutResultsPanel';
import { AdminRecalculateScoresPanel } from '../components/admin/AdminRecalculateScoresPanel';
import { AdminThirdPlaceAssignmentPanel } from '../components/admin/AdminThirdPlaceAssignmentPanel';
import { AdminTieBreakersPanel } from '../components/admin/AdminTieBreakersPanel';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { InfoButton } from '../components/ui/InfoButton';
import { help } from '../lib/help/helpContent';
import { USE_MOCKS } from '../lib/constants';

export function AdminResultsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { fixture, reload: reloadFixture } = useTournamentFixture();
  const { kpis } = useAdminKpis();
  const r = useAdminResults({
    allMatches: fixture.matches,
    allTeams: fixture.teams,
    reloadFixture
  });

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Resultados reales</p>
            <h1 className="text-3xl font-semibold text-corex-ink">
              Carga de resultados oficiales
              <InfoButton title={help.adminResultsGroups.title} className="ml-2 align-middle">{help.adminResultsGroups.body}</InfoButton>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="danger" onClick={r.clearAll} icon={<Trash2 size={15} />} title="Vaciar todo el formulario (no toca BD)">
              Vaciar
            </Button>
            <Button variant="secondary" onClick={() => void r.saveAll()} icon={<Save size={15} />} title="Guardar a BD todos los partidos pendientes">
              Guardar todo
            </Button>
            <Button variant="secondary" onClick={() => void reloadFixture()} icon={<RefreshCw size={15} />}>Refrescar</Button>
            <Button
              onClick={() => void r.recalculate()}
              disabled={r.rankingStatus === 'calculating'}
              icon={<Calculator size={15} />}
            >
              {r.rankingStatus === 'calculating' ? 'Recalculando…' : r.pendingRecalc > 0 ? `Recalcular (${r.pendingRecalc} cambios)` : 'Recalcular ranking'}
            </Button>
          </div>
        </div>

        {r.pendingRecalc > 0 && (
          <Card className="border-cup-gold/40 bg-cup-gold/10">
            <p className="text-sm font-bold text-corex-ink">
              <Calculator size={15} className="mr-1 inline" />
              Hay {r.pendingRecalc} cambio{r.pendingRecalc === 1 ? '' : 's'} sin recalcular. Los puntos del ranking no reflejan los últimos resultados hasta que recalcules.
            </p>
          </Card>
        )}

        <Card>
          <p className="text-sm text-corex-ink/65">
            {USE_MOCKS
              ? 'Modo mock: TTHH puede practicar carga de grupos, asignación de terceros, eliminatorias y recálculo.'
              : 'Modo real: cada marcador se guarda con el botón "Guardar" de cada partido (llama save_actual_result en Supabase). El recálculo del ranking se dispara con el botón superior derecho cuando estás listo.'}
          </p>
        </Card>

        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {([
            ['groups', 'Grupos'],
            ['standings', 'Tablas'],
            ['thirds', 'Terceros'],
            ['knockout', 'Eliminatorias'],
            ['ranking', 'Ranking']
          ] as const).map(([key, label]) => (
            <Button key={key} variant={r.tab === key ? 'primary' : 'secondary'} onClick={() => r.setTab(key as AdminResultsTab)}>{label}</Button>
          ))}
          <InfoButton
            title={
              r.tab === 'groups' ? help.adminResultsGroups.title :
              r.tab === 'thirds' ? help.predictionThird.title :
              r.tab === 'knockout' ? help.adminResultsKO.title :
              r.tab === 'ranking' ? help.adminRecalc.title :
              help.adminResultsGroups.title
            }
          >
            {
              r.tab === 'groups' ? help.adminResultsGroups.body :
              r.tab === 'thirds' ? help.predictionThird.body :
              r.tab === 'knockout' ? help.adminResultsKO.body :
              r.tab === 'ranking' ? help.adminRecalc.body :
              help.adminResultsGroups.body
            }
          </InfoButton>
        </div>

        {r.tab === 'groups' && (
          <AdminGroupResultsPanel
            matches={r.groupMatches}
            teams={fixture.teams}
            results={r.resultRows}
            onChange={r.setGroupResult}
            onSave={r.saveGroupResult}
            saveStatusByMatch={r.saveStatusByMatch}
            saveErrorByMatch={r.saveErrorByMatch}
          />
        )}
        {r.tab === 'standings' && (
          <div className="space-y-4">
            <AdminTieBreakersPanel
              standings={r.standings}
              teams={fixture.teams}
              fairPlayPoints={r.fairPlayPoints}
              manualTieBreakers={r.manualTieBreakers}
              onFairPlayChange={r.setFairPlay}
              onManualTieBreaker={r.setManualTieBreaker}
            />
            <AdminGroupStandingsPanel standings={r.standings} bestThirds={r.qualified.bestThirds} teams={fixture.teams} />
          </div>
        )}
        {r.tab === 'thirds' && (
          <div className="space-y-4">
            <AdminThirdPlaceAssignmentPanel
              slots={r.thirdSlots}
              bestThirds={r.qualified.bestThirds}
              teams={fixture.teams}
              onAssign={r.assignThird}
              onAutoAssign={r.autoAssignThirds}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={!r.canBuildBracket} onClick={r.buildRealBracket}>Construir dieciseisavos (vista previa)</Button>
              <Button disabled={!r.canBuildBracket} onClick={() => void r.applyThirdsToOfficialBracket()}>Aplicar terceros al bracket oficial</Button>
            </div>
          </div>
        )}
        {r.tab === 'knockout' && (
          <AdminKnockoutResultsPanel
            matches={r.bracket}
            teams={fixture.teams}
            onChange={r.setKnockoutResult}
            onSave={r.saveKnockoutResult}
            saveStatusByMatch={r.saveStatusByMatch}
            saveErrorByMatch={r.saveErrorByMatch}
            officialMatchIds={r.officialMatchIds}
          />
        )}
        {r.tab === 'ranking' && (
          <AdminRecalculateScoresPanel
            status={r.rankingStatus}
            processed={kpis.ticketsSold}
            updatedAt={r.rankingUpdatedAt}
            onRecalculate={r.recalculate}
          />
        )}
      </div>
    </div>
  );
}
