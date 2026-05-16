import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Calculator, RefreshCw } from 'lucide-react';
import { mockRanking } from '../data/mock/ranking';
import { AdminGroupResultsPanel, type SaveStatus } from '../components/admin/AdminGroupResultsPanel';
import { AdminGroupStandingsPanel } from '../components/admin/AdminGroupStandingsPanel';
import { AdminKnockoutResultsPanel } from '../components/admin/AdminKnockoutResultsPanel';
import { AdminRecalculateScoresPanel } from '../components/admin/AdminRecalculateScoresPanel';
import { AdminThirdPlaceAssignmentPanel } from '../components/admin/AdminThirdPlaceAssignmentPanel';
import { AdminTieBreakersPanel } from '../components/admin/AdminTieBreakersPanel';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { ScorePrediction } from '../types/tournament';
import { buildInitialBracket, createThirdPlaceSlots, updateBracketScore } from '../lib/bracketBuilder';
import { validateGroupStep, validateThirdPlaceAssignments } from '../lib/predictionValidation';
import { calculateGroupStandings, getQualifiedTeams } from '../lib/standings';
import { findValidThirdPlaceAssignment } from '../lib/thirdPlaceAssignment';
import { useTournamentFixture } from '../hooks/useTournamentFixture';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
const AdminPdfPanel = lazy(() => import('../components/admin/AdminPdfPanel').then((m) => ({ default: m.AdminPdfPanel })));

type Tab = 'groups' | 'standings' | 'thirds' | 'knockout' | 'ranking' | 'pdf';

export function AdminResultsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { fixture, reload: reloadFixture } = useTournamentFixture();
  const allMatches = fixture.matches;
  const allTeams = fixture.teams;
  const [tab, setTab] = useState<Tab>('groups');
  const [results, setResults] = useState<Record<string, ScorePrediction>>({});
  const [thirdSlots, setThirdSlots] = useState(() => createThirdPlaceSlots(allMatches));
  const [bracket, setBracket] = useState(() => buildInitialBracket(allMatches, [], thirdSlots, { loadOfficial: true }));

  const [saveStatusByMatch, setSaveStatusByMatch] = useState<Record<string, SaveStatus>>({});
  const [saveErrorByMatch, setSaveErrorByMatch] = useState<Record<string, string>>({});
  const [pendingRecalc, setPendingRecalc] = useState<number>(0);

  // Re-derivar bracket cuando el fixture cambia (después de save_actual_result + reload).
  useEffect(() => {
    setBracket(buildInitialBracket(allMatches, [], thirdSlots, { loadOfficial: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatches]);

  // Sync inicial: si en allMatches hay scores oficiales, poblamos `results` y marcamos
  // los matches como 'saved' en el local state.
  useEffect(() => {
    const officialGroupResults: Record<string, ScorePrediction> = {};
    const officialStatus: Record<string, SaveStatus> = {};
    allMatches.forEach((match) => {
      if (match.status === 'official' && match.homeScore !== null && match.awayScore !== null) {
        if (match.stage === 'GROUP') {
          officialGroupResults[match.id] = { matchId: match.id, homeScore: match.homeScore ?? null, awayScore: match.awayScore ?? null };
        }
        officialStatus[match.id] = 'saved';
      }
    });
    setResults((current) => ({ ...officialGroupResults, ...current }));
    setSaveStatusByMatch((current) => ({ ...officialStatus, ...current }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatches]);

  const [fairPlayPoints, setFairPlayPoints] = useState<Record<string, number>>({});
  const [manualTieBreakers, setManualTieBreakers] = useState<Record<string, string[]>>({});
  const [rankingStatus, setRankingStatus] = useState<'pending' | 'calculating' | 'calculated' | 'error'>('pending');
  const [rankingUpdatedAt, setRankingUpdatedAt] = useState<string | null>(null);

  const groupMatches = useMemo(() => allMatches.filter((match) => match.stage === 'GROUP'), [allMatches]);
  const resultRows = useMemo(() => Object.values(results), [results]);
  const standings = useMemo(() => calculateGroupStandings(allTeams, groupMatches, resultRows, { fairPlayPoints, manualTieBreakers }), [allTeams, fairPlayPoints, groupMatches, manualTieBreakers, resultRows]);
  const qualified = useMemo(() => getQualifiedTeams(standings), [standings]);
  const canBuildBracket = validateGroupStep(groupMatches, resultRows, standings).length === 0 && validateThirdPlaceAssignments(thirdSlots, qualified.bestThirds).length === 0;
  const officialMatchIds = useMemo(() => new Set(allMatches.flatMap((m) => m.status === 'official' ? [m.id] : [])), [allMatches]);

  function setGroupResult(matchId: string, homeScore: number | null, awayScore: number | null) {
    setResults((current) => ({ ...current, [matchId]: { matchId, homeScore, awayScore } }));
    // Si los valores cambian respecto al oficial, marca como 'idle' para que el usuario sepa que hay un cambio sin guardar.
    setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'idle' }));
  }

  async function saveGroupResult(matchId: string) {
    const result = results[matchId];
    if (!result || result.homeScore === null || result.awayScore === null) return;
    setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'saving' }));
    setSaveErrorByMatch((current) => { const next = { ...current }; delete next[matchId]; return next; });
    if (USE_MOCKS || !supabase) {
      setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'saved' }));
      setPendingRecalc((n) => n + 1);
      return;
    }
    const { error } = await supabase.rpc('save_actual_result', {
      p_match_id: matchId,
      p_home_score: result.homeScore,
      p_away_score: result.awayScore,
      p_penalty_winner_team_id: null
    });
    if (error) {
      setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'error' }));
      setSaveErrorByMatch((current) => ({ ...current, [matchId]: error.message }));
      return;
    }
    setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'saved' }));
    setPendingRecalc((n) => n + 1);
    await reloadFixture();
  }

  function assignThird(slotId: string, teamId: string | null) {
    setThirdSlots((current) => current.map((slot) => slot.slotId === slotId ? { ...slot, assignedTeamId: teamId } : slot));
  }

  function autoAssignThirds() {
    const assignment = findValidThirdPlaceAssignment(thirdSlots, qualified.bestThirds);
    if (assignment) setThirdSlots(assignment);
  }

  function setFairPlay(teamId: string, points: number | null) {
    setFairPlayPoints((current) => {
      const next = { ...current };
      if (points === null || Number.isNaN(points)) delete next[teamId];
      else next[teamId] = points;
      return next;
    });
  }

  function setManualTieBreaker(groupCode: string, orderedTeamIds: string[]) {
    setManualTieBreakers((current) => ({ ...current, [groupCode]: orderedTeamIds }));
  }

  function buildRealBracket() {
    if (!canBuildBracket) return;
    setBracket(buildInitialBracket(allMatches, standings, thirdSlots, { loadOfficial: true }));
    setTab('knockout');
  }

  function setKnockoutResult(matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) {
    setBracket((current) => updateBracketScore(current, matchId, homeScore, awayScore, advancingTeamId));
    setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'idle' }));
  }

  async function saveKnockoutResult(matchId: string) {
    const match = bracket.find((m) => m.id === matchId);
    if (!match || match.homeScore === null || match.awayScore === null) return;
    setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'saving' }));
    setSaveErrorByMatch((current) => { const next = { ...current }; delete next[matchId]; return next; });
    if (USE_MOCKS || !supabase) {
      setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'saved' }));
      setPendingRecalc((n) => n + 1);
      return;
    }
    const penaltyWinner = match.homeScore === match.awayScore ? match.advancingTeamId ?? null : null;
    const { error } = await supabase.rpc('save_actual_result', {
      p_match_id: matchId,
      p_home_score: match.homeScore,
      p_away_score: match.awayScore,
      p_penalty_winner_team_id: penaltyWinner
    });
    if (error) {
      setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'error' }));
      setSaveErrorByMatch((current) => ({ ...current, [matchId]: error.message }));
      return;
    }
    setSaveStatusByMatch((current) => ({ ...current, [matchId]: 'saved' }));
    setPendingRecalc((n) => n + 1);
    await reloadFixture();
  }

  async function recalculate() {
    setRankingStatus('calculating');
    if (USE_MOCKS || !supabase) {
      window.setTimeout(() => {
        setRankingStatus('calculated');
        setRankingUpdatedAt(new Date().toISOString());
        setPendingRecalc(0);
      }, 450);
      return;
    }
    const { error } = await supabase.rpc('recalculate_all_scores');
    if (error) {
      setRankingStatus('error');
      return;
    }
    await reloadFixture();
    setRankingStatus('calculated');
    setRankingUpdatedAt(new Date().toISOString());
    setPendingRecalc(0);
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Resultados reales</p>
            <h1 className="text-3xl font-semibold text-white">Carga de resultados oficiales</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void reloadFixture()} icon={<RefreshCw size={15} />}>Refrescar</Button>
            <Button
              onClick={() => void recalculate()}
              disabled={rankingStatus === 'calculating'}
              icon={<Calculator size={15} />}
            >
              {rankingStatus === 'calculating' ? 'Recalculando…' : pendingRecalc > 0 ? `Recalcular (${pendingRecalc} cambios)` : 'Recalcular ranking'}
            </Button>
          </div>
        </div>

        {pendingRecalc > 0 && (
          <Card className="border-cup-gold/40 bg-cup-gold/10">
            <p className="text-sm font-bold text-white">
              <Calculator size={15} className="mr-1 inline" />
              Hay {pendingRecalc} cambio{pendingRecalc === 1 ? '' : 's'} sin recalcular. Los puntos del ranking no reflejan los últimos resultados hasta que recalcules.
            </p>
          </Card>
        )}

        <Card>
          <p className="text-sm text-white/65">
            {USE_MOCKS
              ? 'Modo mock: TTHH puede practicar carga de grupos, asignación de terceros, eliminatorias y recálculo.'
              : 'Modo real: cada marcador se guarda con el botón "Guardar" de cada partido (llama save_actual_result en Supabase). El recálculo del ranking se dispara con el botón superior derecho cuando estás listo.'}
          </p>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {[
            ['groups', 'Grupos'],
            ['standings', 'Tablas'],
            ['thirds', 'Terceros'],
            ['knockout', 'Eliminatorias'],
            ['ranking', 'Ranking'],
            ['pdf', 'Plantillas PDF']
          ].map(([key, label]) => <Button key={key} variant={tab === key ? 'primary' : 'secondary'} onClick={() => setTab(key as Tab)}>{label}</Button>)}
        </div>

        {tab === 'groups' && (
          <AdminGroupResultsPanel
            matches={groupMatches}
            teams={allTeams}
            results={resultRows}
            onChange={setGroupResult}
            onSave={saveGroupResult}
            saveStatusByMatch={saveStatusByMatch}
            saveErrorByMatch={saveErrorByMatch}
          />
        )}
        {tab === 'standings' && (
          <div className="space-y-4">
            <AdminTieBreakersPanel standings={standings} teams={allTeams} fairPlayPoints={fairPlayPoints} manualTieBreakers={manualTieBreakers} onFairPlayChange={setFairPlay} onManualTieBreaker={setManualTieBreaker} />
            <AdminGroupStandingsPanel standings={standings} bestThirds={qualified.bestThirds} teams={allTeams} />
          </div>
        )}
        {tab === 'thirds' && (
          <div className="space-y-4">
            <AdminThirdPlaceAssignmentPanel slots={thirdSlots} bestThirds={qualified.bestThirds} teams={allTeams} onAssign={assignThird} onAutoAssign={autoAssignThirds} />
            <Button disabled={!canBuildBracket} onClick={buildRealBracket}>Construir dieciseisavos reales</Button>
          </div>
        )}
        {tab === 'knockout' && (
          <AdminKnockoutResultsPanel
            matches={bracket}
            teams={allTeams}
            onChange={setKnockoutResult}
            onSave={saveKnockoutResult}
            saveStatusByMatch={saveStatusByMatch}
            saveErrorByMatch={saveErrorByMatch}
            officialMatchIds={officialMatchIds}
          />
        )}
        {tab === 'ranking' && <AdminRecalculateScoresPanel status={rankingStatus} processed={mockRanking.length} updatedAt={rankingUpdatedAt} onRecalculate={recalculate} />}
        {tab === 'pdf' && (
          <Suspense fallback={<Card><p className="text-white/55">Cargando módulo de PDFs…</p></Card>}>
            <AdminPdfPanel teams={allTeams} matches={allMatches} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
