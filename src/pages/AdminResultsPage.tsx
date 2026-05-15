import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { mockRanking } from '../data/mock/ranking';
import { AdminGroupResultsPanel } from '../components/admin/AdminGroupResultsPanel';
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

  // Re-derivar bracket cuando el fixture cambia (después de save_actual_result + reload).
  // Así los equipos resueltos por resolve_actual_knockout_teams llegan a la UI y los
  // marcadores oficiales se restauran tras un refresh de página.
  useEffect(() => {
    setBracket(buildInitialBracket(allMatches, [], thirdSlots, { loadOfficial: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatches]);

  // Sync initial group results from fixture for any matches already marked 'official'.
  useEffect(() => {
    const officialGroupResults: Record<string, ScorePrediction> = {};
    allMatches.forEach((match) => {
      if (match.stage === 'GROUP' && match.status === 'official' && match.homeScore !== null && match.awayScore !== null) {
        officialGroupResults[match.id] = { matchId: match.id, homeScore: match.homeScore ?? null, awayScore: match.awayScore ?? null };
      }
    });
    setResults((current) => ({ ...officialGroupResults, ...current }));
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

  async function setGroupResult(matchId: string, homeScore: number | null, awayScore: number | null) {
    setResults((current) => ({ ...current, [matchId]: { matchId, homeScore, awayScore } }));
    if (!USE_MOCKS && supabase && homeScore !== null && awayScore !== null) {
      const { error } = await supabase.rpc('save_actual_result', {
        p_match_id: matchId,
        p_home_score: homeScore,
        p_away_score: awayScore,
        p_penalty_winner_team_id: null
      });
      if (error) {
        setRankingStatus('error');
      } else {
        // Recarga el fixture: Supabase ya resolvió standings + knockout teams para R32.
        await reloadFixture();
      }
    }
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
    setBracket(buildInitialBracket(allMatches, standings, thirdSlots));
    setTab('knockout');
  }

  async function setKnockoutResult(matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) {
    setBracket((current) => updateBracketScore(current, matchId, homeScore, awayScore, advancingTeamId));
    if (!USE_MOCKS && supabase && homeScore !== null && awayScore !== null) {
      const penaltyWinner = homeScore === awayScore ? advancingTeamId ?? null : null;
      const { error } = await supabase.rpc('save_actual_result', {
        p_match_id: matchId,
        p_home_score: homeScore,
        p_away_score: awayScore,
        p_penalty_winner_team_id: penaltyWinner
      });
      if (error) {
        setRankingStatus('error');
      } else {
        await reloadFixture();
      }
    }
  }

  async function recalculate() {
    setRankingStatus('calculating');
    if (USE_MOCKS || !supabase) {
      window.setTimeout(() => {
        setRankingStatus('calculated');
        setRankingUpdatedAt(new Date().toISOString());
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
  }

  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Resultados reales</p>
          <h1 className="text-3xl font-black text-white">Carga de resultados oficiales</h1>
        </div>
        <Card><p className="text-sm text-white/65">{USE_MOCKS ? 'Modo mock: TTHH puede practicar carga de grupos, asignación de terceros, eliminatorias y recálculo.' : 'Modo real: cada marcador llama save_actual_result en Supabase. El recálculo dispara recalculate_all_scores y refresca el ranking.'}</p></Card>
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

        {tab === 'groups' && <AdminGroupResultsPanel matches={groupMatches} teams={allTeams} results={resultRows} onChange={setGroupResult} />}
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
        {tab === 'knockout' && <AdminKnockoutResultsPanel matches={bracket} teams={allTeams} onChange={setKnockoutResult} />}
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
