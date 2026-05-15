import { useEffect, useMemo, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { PredictionDraft } from '../types/prediction';
import type { Match, ScorePrediction, Team } from '../types/tournament';
import { mockMatches } from '../data/mock/matches';
import { mockTeams } from '../data/mock/teams';
import { calculateGroupStandings, getGroupsNeedingManualTieBreaker, getQualifiedTeams, isGroupStageComplete } from '../lib/tournament';
import { calculateProgress } from '../lib/scoring';
import { buildInitialBracket, createThirdPlaceSlots, summarizeFinalPrediction, updateBracketScore } from '../lib/bracketBuilder';
import { sanitizeThirdPlaceAssignments, validateGroupStep, validateKnockout, validateThirdPlaceAssignments } from '../lib/predictionValidation';
import { findValidThirdPlaceAssignment } from '../lib/thirdPlaceAssignment';

interface UsePredictionOptions {
  teams?: Team[];
  matches?: Match[];
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
  const [draft, setDraft] = useState<PredictionDraft>(() => loadDraft(ticketId));
  const [saving, setSaving] = useState(false);
  const groupMatches = useMemo(() => matches.filter((match) => match.stage === 'GROUP'), [matches]);
  const knockoutMatches = useMemo(() => matches.filter((match) => match.stage !== 'GROUP'), [matches]);

  useEffect(() => {
    window.localStorage.setItem(`polla_prediction_${ticketId}`, JSON.stringify(draft));
  }, [draft, ticketId]);

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
    setDraft((current) => touch({
      ...current,
      thirdPlaceAssignments: assignment,
      bracketMatches: [],
      status: 'draft'
    }));
    return [];
  }

  function setKnockoutScore(matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) {
    setDraft((current) => touch({
      ...current,
      bracketMatches: updateBracketScore(current.bracketMatches, matchId, homeScore, awayScore, advancingTeamId),
      status: current.status === 'submitted' ? 'ready_for_knockout' : current.status
    }));
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
        // Construye payload para submit_complete_prediction.
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
              // Localiza el partido R32 por matchNo para mapear slot_match_id (uuid).
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
    saving
  };
}
