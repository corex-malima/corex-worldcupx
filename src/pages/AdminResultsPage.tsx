import { useMemo, useState } from 'react';
import { mockMatches } from '../data/mock/matches';
import { mockRanking } from '../data/mock/ranking';
import { mockTeams } from '../data/mock/teams';
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

type Tab = 'groups' | 'standings' | 'thirds' | 'knockout' | 'ranking';

export function AdminResultsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [tab, setTab] = useState<Tab>('groups');
  const [results, setResults] = useState<Record<string, ScorePrediction>>({});
  const [thirdSlots, setThirdSlots] = useState(() => createThirdPlaceSlots(mockMatches));
  const [bracket, setBracket] = useState(() => buildInitialBracket(mockMatches, [], thirdSlots));
  const [fairPlayPoints, setFairPlayPoints] = useState<Record<string, number>>({});
  const [manualTieBreakers, setManualTieBreakers] = useState<Record<string, string[]>>({});
  const [rankingStatus, setRankingStatus] = useState<'pending' | 'calculating' | 'calculated' | 'error'>('pending');
  const [rankingUpdatedAt, setRankingUpdatedAt] = useState<string | null>(null);

  const groupMatches = useMemo(() => mockMatches.filter((match) => match.stage === 'GROUP'), []);
  const resultRows = useMemo(() => Object.values(results), [results]);
  const standings = useMemo(() => calculateGroupStandings(mockTeams, groupMatches, resultRows, { fairPlayPoints, manualTieBreakers }), [fairPlayPoints, groupMatches, manualTieBreakers, resultRows]);
  const qualified = useMemo(() => getQualifiedTeams(standings), [standings]);
  const canBuildBracket = validateGroupStep(groupMatches, resultRows, standings).length === 0 && validateThirdPlaceAssignments(thirdSlots, qualified.bestThirds).length === 0;

  function setGroupResult(matchId: string, homeScore: number | null, awayScore: number | null) {
    setResults((current) => ({ ...current, [matchId]: { matchId, homeScore, awayScore } }));
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
    setBracket(buildInitialBracket(mockMatches, standings, thirdSlots));
    setTab('knockout');
  }

  function setKnockoutResult(matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) {
    setBracket((current) => updateBracketScore(current, matchId, homeScore, awayScore, advancingTeamId));
  }

  function recalculate() {
    setRankingStatus('calculating');
    window.setTimeout(() => {
      setRankingStatus('calculated');
      setRankingUpdatedAt(new Date().toISOString());
    }, 450);
  }

  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-gold">Resultados reales</p>
          <h1 className="text-3xl font-black text-white">Carga de resultados oficiales</h1>
        </div>
        <Card><p className="text-sm text-white/65">Modo mock: TTHH puede practicar carga de grupos, asignación de terceros, eliminatorias y recálculo. En Supabase esto debe pasar por RPCs con validación PostgreSQL y rol admin.</p></Card>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {[
            ['groups', 'Grupos'],
            ['standings', 'Tablas'],
            ['thirds', 'Terceros'],
            ['knockout', 'Eliminatorias'],
            ['ranking', 'Ranking']
          ].map(([key, label]) => <Button key={key} variant={tab === key ? 'primary' : 'secondary'} onClick={() => setTab(key as Tab)}>{label}</Button>)}
        </div>

        {tab === 'groups' && <AdminGroupResultsPanel matches={groupMatches} teams={mockTeams} results={resultRows} onChange={setGroupResult} />}
        {tab === 'standings' && (
          <div className="space-y-4">
            <AdminTieBreakersPanel standings={standings} teams={mockTeams} fairPlayPoints={fairPlayPoints} manualTieBreakers={manualTieBreakers} onFairPlayChange={setFairPlay} onManualTieBreaker={setManualTieBreaker} />
            <AdminGroupStandingsPanel standings={standings} bestThirds={qualified.bestThirds} teams={mockTeams} />
          </div>
        )}
        {tab === 'thirds' && (
          <div className="space-y-4">
            <AdminThirdPlaceAssignmentPanel slots={thirdSlots} bestThirds={qualified.bestThirds} teams={mockTeams} onAssign={assignThird} onAutoAssign={autoAssignThirds} />
            <Button disabled={!canBuildBracket} onClick={buildRealBracket}>Construir dieciseisavos reales</Button>
          </div>
        )}
        {tab === 'knockout' && <AdminKnockoutResultsPanel matches={bracket} teams={mockTeams} onChange={setKnockoutResult} />}
        {tab === 'ranking' && <AdminRecalculateScoresPanel status={rankingStatus} processed={mockRanking.length} updatedAt={rankingUpdatedAt} onRecalculate={recalculate} />}
      </div>
    </div>
  );
}
