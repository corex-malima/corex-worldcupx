import { useEffect, useMemo, useRef, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { SaveStatus } from '../components/admin/AdminGroupResultsPanel';
import type { Match, ScorePrediction, Team } from '../types/tournament';
import { buildInitialBracket, createThirdPlaceSlots, updateBracketScore } from '../lib/bracketBuilder';
import { validateGroupStep, validateThirdPlaceAssignments } from '../lib/predictionValidation';
import { calculateGroupStandings, getQualifiedTeams } from '../lib/standings';
import { findValidThirdPlaceAssignment } from '../lib/thirdPlaceAssignment';

export type AdminResultsTab = 'groups' | 'standings' | 'thirds' | 'knockout' | 'ranking';

interface UseAdminResultsArgs {
  allMatches: Match[];
  allTeams: Team[];
  reloadFixture: () => Promise<void> | void;
}

/**
 * Encapsula TODA la lógica de la pantalla Admin → Resultados Oficiales:
 *   - 11 useStates locales (resultados, third slots, bracket, save status,
 *     fair play, manual tie breakers, ranking status, etc).
 *   - Handlers de guardado individual y bulk (saveAll), clearAll, recalc.
 *   - Derived state via useMemo (standings, qualified, canBuildBracket).
 *
 * La página `AdminResultsPage` queda como capa de presentación pura: llama
 * este hook y renderiza panels condicionales según el `tab` actual.
 *
 * El parámetro `reloadFixture` se inyecta para evitar acoplar el hook al
 * `useTournamentFixture` (mantiene testabilidad y desacopla side-effects).
 */
export function useAdminResults({ allMatches, allTeams, reloadFixture }: UseAdminResultsArgs) {
  const [tab, setTab] = useState<AdminResultsTab>('groups');
  const [results, setResults] = useState<Record<string, ScorePrediction>>({});
  const [thirdSlots, setThirdSlots] = useState(() => createThirdPlaceSlots(allMatches));
  const [bracket, setBracket] = useState(() => buildInitialBracket(allMatches, [], thirdSlots, { loadOfficial: true }));
  const [saveStatusByMatch, setSaveStatusByMatch] = useState<Record<string, SaveStatus>>({});
  const [saveErrorByMatch, setSaveErrorByMatch] = useState<Record<string, string>>({});
  const [pendingRecalc, setPendingRecalc] = useState<number>(0);
  const [fairPlayPoints, setFairPlayPoints] = useState<Record<string, number>>({});
  const [manualTieBreakers, setManualTieBreakers] = useState<Record<string, string[]>>({});
  const [rankingStatus, setRankingStatus] = useState<'pending' | 'calculating' | 'calculated' | 'error'>('pending');
  const [rankingUpdatedAt, setRankingUpdatedAt] = useState<string | null>(null);

  // Re-derivar bracket cuando el fixture cambia (después de save_actual_result + reload).
  useEffect(() => {
    setBracket(buildInitialBracket(allMatches, [], thirdSlots, { loadOfficial: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatches]);

  // Sync inicial: si en allMatches hay scores oficiales, poblamos `results` y
  // marcamos los matches como 'saved' en el local state.
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

  // Derived state
  const groupMatches = useMemo(() => allMatches.filter((m) => m.stage === 'GROUP'), [allMatches]);
  const resultRows = useMemo(() => Object.values(results), [results]);
  const standings = useMemo(
    () => calculateGroupStandings(allTeams, groupMatches, resultRows, { fairPlayPoints, manualTieBreakers }),
    [allTeams, fairPlayPoints, groupMatches, manualTieBreakers, resultRows]
  );
  const qualified = useMemo(() => getQualifiedTeams(standings), [standings]);
  const canBuildBracket = validateGroupStep(groupMatches, resultRows, standings).length === 0
    && validateThirdPlaceAssignments(thirdSlots, qualified.bestThirds).length === 0;
  const officialMatchIds = useMemo(
    () => new Set(allMatches.flatMap((m) => m.status === 'official' ? [m.id] : [])),
    [allMatches]
  );

  // Ref del bracket actualizado: clearAll/saveAll necesitan leer el estado más
  // reciente después de cualquier propagación.
  const bracketRef = useRef(bracket);
  useEffect(() => { bracketRef.current = bracket; }, [bracket]);

  // ============================ HANDLERS ============================

  function setGroupResult(matchId: string, homeScore: number | null, awayScore: number | null) {
    setResults((current) => ({ ...current, [matchId]: { matchId, homeScore, awayScore } }));
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

  // Vaciar formularios (botón permanente). NO toca BD: solo el form local.
  function clearAll() {
    if (!window.confirm('¿Vaciar TODO el form de resultados (grupos + bracket)? Esto NO borra los resultados ya guardados en BD, solo limpia la pantalla.')) return;
    groupMatches.forEach((match) => setGroupResult(match.id, null, null));
    bracketRef.current.forEach((match) => setKnockoutResult(match.id, null, null, null));
    setTab('groups');
  }

  // Guarda a BD todos los partidos pendientes. Secuencial intencional para
  // evitar race conditions con reloadFixture() + setSaveStatusByMatch acumulativo.
  async function saveAll() {
    const pending: { id: string; kind: 'group' | 'knockout' }[] = [];
    Object.entries(results).forEach(([matchId, res]) => {
      if (res.homeScore !== null && res.awayScore !== null && saveStatusByMatch[matchId] !== 'saved') {
        pending.push({ id: matchId, kind: 'group' });
      }
    });
    bracketRef.current.forEach((m) => {
      if (m.homeScore !== null && m.awayScore !== null && saveStatusByMatch[m.id] !== 'saved') {
        pending.push({ id: m.id, kind: 'knockout' });
      }
    });
    if (pending.length === 0) {
      window.alert('No hay partidos pendientes por guardar.');
      return;
    }
    if (!window.confirm(`¿Guardar ${pending.length} partido(s) a BD ahora? Esto persiste los marcadores como resultados oficiales.`)) return;
    // NOTA: Mantener secuencial (no Promise.all). reloadFixture() es global y
    // setSaveStatusByMatch es acumulativo. Promise.all rompería ambos.
    for (const item of pending) {
      if (item.kind === 'group') {
        await saveGroupResult(item.id);
      } else {
        await saveKnockoutResult(item.id);
      }
    }
    window.alert(`${pending.length} partido(s) guardados. Recuerda recalcular el ranking para que los puntos se actualicen.`);
  }

  return {
    // UI state
    tab,
    setTab,
    // Form state
    results,
    resultRows,
    saveStatusByMatch,
    saveErrorByMatch,
    pendingRecalc,
    // Bracket state
    thirdSlots,
    bracket,
    // Group settings
    fairPlayPoints,
    manualTieBreakers,
    // Ranking state
    rankingStatus,
    rankingUpdatedAt,
    // Derived
    groupMatches,
    standings,
    qualified,
    canBuildBracket,
    officialMatchIds,
    // Handlers
    setGroupResult,
    saveGroupResult,
    assignThird,
    autoAssignThirds,
    setFairPlay,
    setManualTieBreaker,
    buildRealBracket,
    setKnockoutResult,
    saveKnockoutResult,
    recalculate,
    clearAll,
    saveAll
  };
}
