import { useEffect, useMemo, useState } from 'react';
import type { PredictionDraft } from '../types/prediction';
import type { ScorePrediction } from '../types/tournament';
import { mockMatches } from '../data/mock/matches';
import { mockTeams } from '../data/mock/teams';
import { calculateGroupStandings, getQualifiedTeams } from '../lib/tournament';
import { calculateProgress } from '../lib/scoring';
import { buildInitialBracket, createThirdPlaceSlots, summarizeFinalPrediction, updateBracketScore } from '../lib/bracketBuilder';
import { sanitizeThirdPlaceAssignments, validateGroupStep, validateKnockout, validateThirdPlaceAssignments } from '../lib/predictionValidation';

function createInitialDraft(ticketId: string): PredictionDraft {
  return {
    ticketId,
    groupScores: {},
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
    return raw ? JSON.parse(raw) as PredictionDraft : createInitialDraft(ticketId);
  } catch {
    return createInitialDraft(ticketId);
  }
}

export function usePrediction(ticketId: string) {
  const [draft, setDraft] = useState<PredictionDraft>(() => loadDraft(ticketId));
  const [saving, setSaving] = useState(false);
  const groupMatches = useMemo(() => mockMatches.filter((match) => match.stage === 'GROUP'), []);
  const knockoutMatches = useMemo(() => mockMatches.filter((match) => match.stage !== 'GROUP'), []);

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
      status: current.status === 'submitted' ? 'draft' : current.status
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
    const groupErrors = validateGroupStep(groupMatches, predictions);
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

  function setKnockoutScore(matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null) {
    setDraft((current) => touch({
      ...current,
      bracketMatches: updateBracketScore(current.bracketMatches, matchId, homeScore, awayScore, advancingTeamId),
      status: current.status === 'submitted' ? 'ready_for_knockout' : current.status
    }));
  }

  async function submitPrediction(): Promise<string[]> {
    const errors = [...validateGroupStep(groupMatches, predictions), ...validateThirdPlaceAssignments(thirdPlaceSlots, qualified.bestThirds), ...validateKnockout(draft.bracketMatches)];
    if (errors.length) return errors;
    setSaving(true);
    try {
      setDraft((current) => touch({ ...current, status: 'submitted', submittedAt: new Date().toISOString() }));
    } finally {
      setSaving(false);
    }
    return [];
  }

  const predictions = useMemo<ScorePrediction[]>(() => Object.values(draft.groupScores), [draft.groupScores]);
  const standings = useMemo(() => calculateGroupStandings(mockTeams, groupMatches, predictions), [groupMatches, predictions]);
  const qualified = useMemo(() => getQualifiedTeams(standings), [standings]);
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
    teams: mockTeams,
    matches: mockMatches,
    groupMatches,
    knockoutMatches,
    predictions,
    setScore,
    setThirdAssignment,
    buildKnockoutBracket,
    setKnockoutScore,
    submitPrediction,
    standings,
    qualified,
    thirdPlaceSlots,
    finalSummary,
    progress,
    saving
  };
}
