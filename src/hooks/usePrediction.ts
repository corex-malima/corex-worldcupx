import { useEffect, useMemo, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { PredictionDraft, ThirdPlaceSlot } from '../types/prediction';
import type { Match, ScorePrediction, Team } from '../types/tournament';
import { mockMatches } from '../data/mock/matches';
import { mockTeams } from '../data/mock/teams';
import { calculateGroupStandings, getGroupsNeedingManualTieBreaker, getQualifiedTeams, isGroupStageComplete } from '../lib/tournament';
import { calculateProgress } from '../lib/scoring';
import { buildInitialBracket, createThirdPlaceSlots, summarizeFinalPrediction, updateBracketScore } from '../lib/bracketBuilder';
import { sanitizeThirdPlaceAssignments, validateGroupStep, validateKnockout, validateThirdPlaceAssignments } from '../lib/predictionValidation';
import { findValidThirdPlaceAssignment } from '../lib/thirdPlaceAssignment';
import { useTicketPrediction } from './useTicketPrediction';
import { usePredictionAutoSave } from './usePredictionAutoSave';

interface UsePredictionOptions {
  teams?: Team[];
  matches?: Match[];
  /** Si true, el wizard es controlado por TTHH (admin/super_admin) editando una predicción ajena. */
  adminMode?: boolean;
}

function createInitialDraft(ticketId: string): PredictionDraft {
  return {
    ticketId,
    groupScores: {},
    manualTieBreakers: {},
    thirdPlaceAssignments: [],
    bracketMatches: [],
    status: 'draft',
    updatedAt: new Date().toISOString(),
    submittedAt: null
  };
}

function loadDraft(ticketId: string): PredictionDraft {
  const key = `polla_prediction_${ticketId}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return createInitialDraft(ticketId);
    const parsed = JSON.parse(raw) as Partial<PredictionDraft>;
    return {
      ...createInitialDraft(ticketId),
      ...parsed,
      ticketId,
      groupScores: parsed.groupScores ?? {},
      manualTieBreakers: parsed.manualTieBreakers ?? {},
      thirdPlaceAssignments: parsed.thirdPlaceAssignments ?? [],
      bracketMatches: parsed.bracketMatches ?? []
    };
  } catch {
    return createInitialDraft(ticketId);
  }
}

export function usePrediction(ticketId: string, options: UsePredictionOptions = {}) {
  const teams = options.teams ?? mockTeams;
  const matches = options.matches ?? mockMatches;
  const adminMode = options.adminMode === true;
  const [draft, setDraft] = useState<PredictionDraft>(() => loadDraft(ticketId));
  const [hydrated, setHydrated] = useState<boolean>(USE_MOCKS); // mock no necesita hidratación
  const [saving, setSaving] = useState(false);
  const groupMatches = useMemo(() => matches.filter((match) => match.stage === 'GROUP'), [matches]);
  const knockoutMatches = useMemo(() => matches.filter((match) => match.stage !== 'GROUP'), [matches]);

  const autoSave = usePredictionAutoSave(ticketId);
  const remote = useTicketPrediction(!USE_MOCKS && supabase ? ticketId : null);

  // Persiste localStorage como cache rápido (solo modo usuario; admin no necesita).
  useEffect(() => {
    if (adminMode) return;
    window.localStorage.setItem(`polla_prediction_${ticketId}`, JSON.stringify(draft));
  }, [adminMode, draft, ticketId]);

  // Hidratación inicial desde Supabase (tanto user como admin).
  // Sobrescribe el estado local si Supabase tiene datos para ese ticket.
  useEffect(() => {
    if (USE_MOCKS || !supabase) return;
    if (remote.loading || hydrated) return;
    const r = remote.data;
    if (!r || r.ticketId !== ticketId) return;

    const hasRemoteData =
      r.groupScores.length > 0 ||
      r.knockoutScores.length > 0 ||
      r.thirdPlaceAssignments.length > 0;
    if (!hasRemoteData) {
      // Sin datos remotos: en modo admin partimos vacío; en modo user mantenemos el draft
      // local (que pudo venir de localStorage).
      if (adminMode) {
        setDraft(createInitialDraft(ticketId));
      }
      setHydrated(true);
      return;
    }

    // Hidratar groupScores
    const groupScoresMap: Record<string, { matchId: string; homeScore: number | null; awayScore: number | null }> = {};
    r.groupScores.forEach((s) => {
      groupScoresMap[s.match_id] = {
        matchId: s.match_id,
        homeScore: s.home_score,
        awayScore: s.away_score
      };
    });

    // Hidratar thirdPlaceAssignments mapeando slot_match_id → ThirdPlaceSlot
    const slots = createThirdPlaceSlots(knockoutMatches);
    const slotsByMatchId = new Map<string, ThirdPlaceSlot>();
    slots.forEach((slot) => {
      const match = knockoutMatches.find((m) => m.matchNo === slot.matchNo);
      if (match) slotsByMatchId.set(match.id, slot);
    });
    const hydratedSlots = slots.map((slot) => {
      const match = knockoutMatches.find((m) => m.matchNo === slot.matchNo);
      if (!match) return slot;
      const assignment = r.thirdPlaceAssignments.find((a) => a.slot_match_id === match.id);
      return assignment ? { ...slot, assignedTeamId: assignment.team_id } : slot;
    });

    // Hidratar bracket: para cada knockout match, si hay row en r.knockoutScores, aplicar
    const initialBracket = buildInitialBracket(knockoutMatches, [], hydratedSlots);
    const bracketWithScores = initialBracket.map((m) => {
      const score = r.knockoutScores.find((s) => s.match_id === m.id);
      if (!score) return m;
      return {
        ...m,
        homeTeamId: score.home_team_id ?? m.homeTeamId,
        awayTeamId: score.away_team_id ?? m.awayTeamId,
        homeScore: score.home_score ?? null,
        awayScore: score.away_score ?? null,
        advancingTeamId: score.winner_team_id ?? null
      };
    });

    setDraft({
      ticketId,
      groupScores: groupScoresMap,
      manualTieBreakers: {},
      thirdPlaceAssignments: hydratedSlots,
      bracketMatches: bracketWithScores,
      status: r.status === 'submitted' ? 'submitted' : r.status === 'locked' ? 'locked' : 'ready_for_knockout',
      updatedAt: new Date().toISOString(),
      submittedAt: r.status === 'submitted' ? new Date().toISOString() : null
    });
    setHydrated(true);
  }, [adminMode, hydrated, knockoutMatches, remote.data, remote.loading, ticketId]);

  function touch(next: PredictionDraft): PredictionDraft {
    return { ...next, updatedAt: new Date().toISOString() };
  }

  function setScore(matchId: string, homeScore: number | null, awayScore: number | null) {
    setDraft((current) => touch({
      ...current,
      groupScores: {
        ...current.groupScores,
        [matchId]: { matchId, homeScore, awayScore }
      },
      thirdPlaceAssignments: [],
      bracketMatches: [],
      status: current.status === 'submitted' ? 'draft' : current.status
    }));
    autoSave.saveGroupScore({ matchId, homeScore, awayScore });
  }

  function setManualTieBreaker(groupCode: string, orderedTeamIds: string[]) {
    setDraft((current) => touch({
      ...current,
      manualTieBreakers: {
        ...current.manualTieBreakers,
        [groupCode]: orderedTeamIds
      },
      thirdPlaceAssignments: [],
      bracketMatches: [],
      status: 'draft'
    }));
  }

  function setThirdAssignment(slotId: string, teamId: string | null) {
    setDraft((current) => {
      const sourceSlots = sanitizeThirdPlaceAssignments(
        current.thirdPlaceAssignments.length ? current.thirdPlaceAssignments : createThirdPlaceSlots(knockoutMatches),
        qualified.bestThirds
      );
      const targetSlot = sourceSlots.find((s) => s.slotId === slotId);
      const match = targetSlot ? knockoutMatches.find((m) => m.matchNo === targetSlot.matchNo) : null;
      if (match) {
        autoSave.saveThirdAssignment({ slotMatchId: match.id, teamId });
      }
      return touch({
        ...current,
        thirdPlaceAssignments: sourceSlots.map((slot) => slot.slotId === slotId ? { ...slot, assignedTeamId: teamId } : slot),
        bracketMatches: [],
        status: 'draft'
      });
    });
  }

  function buildKnockoutBracket(): string[] {
    const groupErrors = validateGroupStep(groupMatches, predictions, standings);
    const assignmentSlots = sanitizeThirdPlaceAssignments(
      draft.thirdPlaceAssignments.length ? draft.thirdPlaceAssignments : createThirdPlaceSlots(knockoutMatches),
      qualified.bestThirds
    );
    const thirdErrors = validateThirdPlaceAssignments(assignmentSlots, qualified.bestThirds);
    if (groupErrors.length || thirdErrors.length) return [...groupErrors, ...thirdErrors];
    setDraft((current) => touch({
      ...current,
      thirdPlaceAssignments: assignmentSlots,
      bracketMatches: buildInitialBracket(knockoutMatches, standings, assignmentSlots),
      status: 'ready_for_knockout'
    }));
    return [];
  }

  function autoAssignThirdPlaces(): string[] {
    const sourceSlots = sanitizeThirdPlaceAssignments(
      draft.thirdPlaceAssignments.length ? draft.thirdPlaceAssignments : createThirdPlaceSlots(knockoutMatches),
      qualified.bestThirds
    );
    const assignment = findValidThirdPlaceAssignment(sourceSlots, qualified.bestThirds);
    if (!assignment) return ['No existe una combinacion valida con estos terceros. Ajusta desempates o asignaciones manuales.'];
    // Auto-save: persistir todas las asignaciones nuevas
    assignment.forEach((slot) => {
      const match = knockoutMatches.find((m) => m.matchNo === slot.matchNo);
      if (match) autoSave.saveThirdAssignment({ slotMatchId: match.id, teamId: slot.assignedTeamId });
    });
    setDraft((current) => touch({
      ...current,
      thirdPlaceAssignments: assignment,
      bracketMatches: [],
      status: 'draft'
    }));
    return [];
  }

  function setKnockoutScore(matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) {
    setDraft((current) => {
      const nextBracket = updateBracketScore(current.bracketMatches, matchId, homeScore, awayScore, advancingTeamId);
      const updatedMatch = nextBracket.find((m) => m.id === matchId);
      if (updatedMatch) {
        autoSave.saveKnockoutScore({
          matchId,
          homeScore,
          awayScore,
          homeTeamId: updatedMatch.homeTeamId,
          awayTeamId: updatedMatch.awayTeamId,
          advancingTeamId: updatedMatch.advancingTeamId
        });
      }
      return touch({
        ...current,
        bracketMatches: nextBracket,
        status: current.status === 'submitted' ? 'ready_for_knockout' : current.status
      });
    });
  }

  async function submitPrediction(): Promise<string[]> {
    const errors = [
      ...validateGroupStep(groupMatches, predictions, standings),
      ...validateThirdPlaceAssignments(thirdPlaceSlots, qualified.bestThirds),
      ...validateKnockout(draft.bracketMatches)
    ];
    if (errors.length) return errors;
    setSaving(true);
    try {
      if (!USE_MOCKS && supabase) {
        const payload = {
          group_scores: groupMatches
            .map((match) => {
              const score = draft.groupScores[match.id];
              if (!score || score.homeScore === null || score.awayScore === null) return null;
              return { match_id: match.id, home_score: score.homeScore, away_score: score.awayScore };
            })
            .filter((row): row is { match_id: string; home_score: number; away_score: number } => row !== null),
          third_place_assignments: thirdPlaceSlots
            .filter((slot) => slot.assignedTeamId)
            .map((slot) => {
              const r32 = knockoutMatches.find((match) => match.matchNo === slot.matchNo);
              return r32 ? { slot_match_id: r32.id, team_id: slot.assignedTeamId as string } : null;
            })
            .filter((row): row is { slot_match_id: string; team_id: string } => row !== null),
          knockout_matches: draft.bracketMatches
            .filter((match) => match.homeTeamId && match.awayTeamId && match.homeScore !== null && match.awayScore !== null)
            .map((match) => ({
              match_id: match.id,
              home_team_id: match.homeTeamId,
              away_team_id: match.awayTeamId,
              home_score: match.homeScore,
              away_score: match.awayScore,
              penalty_winner_team_id: match.homeScore === match.awayScore ? match.advancingTeamId : null
            })),
          champion_team_id: finalSummary.championTeamId,
          third_place_team_id: finalSummary.thirdPlaceTeamId
        };

        const { error } = await supabase.rpc('submit_complete_prediction', {
          p_ticket_id: ticketId,
          p_payload: payload
        });
        if (error) {
          setSaving(false);
          return [error.message];
        }
      }
      setDraft((current) => touch({ ...current, status: 'submitted', submittedAt: new Date().toISOString() }));
    } finally {
      setSaving(false);
    }
    return [];
  }

  const predictions = useMemo<ScorePrediction[]>(() => Object.values(draft.groupScores), [draft.groupScores]);
  const standings = useMemo(() => calculateGroupStandings(teams, groupMatches, predictions, { manualTieBreakers: draft.manualTieBreakers }), [draft.manualTieBreakers, groupMatches, predictions, teams]);
  const qualified = useMemo(() => getQualifiedTeams(standings), [standings]);
  const groupsNeedingManualTieBreaker = useMemo(() => isGroupStageComplete(groupMatches, predictions) ? getGroupsNeedingManualTieBreaker(standings) : [], [groupMatches, predictions, standings]);
  const thirdPlaceSlots = useMemo(
    () => sanitizeThirdPlaceAssignments(draft.thirdPlaceAssignments.length ? draft.thirdPlaceAssignments : createThirdPlaceSlots(knockoutMatches), qualified.bestThirds),
    [draft.thirdPlaceAssignments, knockoutMatches, qualified.bestThirds]
  );
  const finalSummary = useMemo(() => summarizeFinalPrediction(draft.bracketMatches), [draft.bracketMatches]);
  const completedKnockout = draft.bracketMatches.filter((match) => match.homeScore !== null && match.awayScore !== null && match.advancingTeamId).length;
  const completedThirdSlots = thirdPlaceSlots.filter((slot) => slot.assignedTeamId).length;
  const progress = useMemo(
    () => calculateProgress(predictions, groupMatches.length + thirdPlaceSlots.length + Math.max(draft.bracketMatches.length, knockoutMatches.length), completedThirdSlots + completedKnockout),
    [completedKnockout, completedThirdSlots, draft.bracketMatches.length, groupMatches.length, knockoutMatches.length, predictions, thirdPlaceSlots.length]
  );

  return {
    draft,
    teams,
    matches,
    groupMatches,
    knockoutMatches,
    predictions,
    setScore,
    setManualTieBreaker,
    setThirdAssignment,
    autoAssignThirdPlaces,
    buildKnockoutBracket,
    setKnockoutScore,
    submitPrediction,
    standings,
    qualified,
    groupsNeedingManualTieBreaker,
    thirdPlaceSlots,
    finalSummary,
    progress,
    saving,
    /** Estado del auto-save remoto: idle | saving | saved | error */
    autoSaveStatus: autoSave.status,
    /** Mensaje del último error de auto-save si lo hubo */
    autoSaveError: autoSave.lastError,
    /** ¿La hidratación inicial desde Supabase ya terminó? */
    hydrating: !hydrated && !USE_MOCKS && supabase !== null,
    adminMode
  };
}
