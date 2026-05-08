import { useMemo, useState } from 'react';
import type { ScorePrediction } from '../types/tournament';
import { mockMatches } from '../data/mock/matches';
import { mockTeams } from '../data/mock/teams';
import { calculateGroupStandings, getQualifiedTeams } from '../lib/tournament';
import { calculateProgress } from '../lib/scoring';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export function usePrediction(ticketId: string) {
  const [predictions, setPredictions] = useState<ScorePrediction[]>([]);
  const [saving, setSaving] = useState(false);

  function setScore(matchId: string, homeScore: number | null, awayScore: number | null, penaltyWinnerTeamId?: string | null) {
    setPredictions((current) => {
      const existing = current.find((prediction) => prediction.matchId === matchId);
      if (existing) {
        return current.map((prediction) => prediction.matchId === matchId ? { ...prediction, homeScore, awayScore, penaltyWinnerTeamId } : prediction);
      }
      return [...current, { matchId, homeScore, awayScore, penaltyWinnerTeamId }];
    });
  }

  async function saveScore(matchId: string) {
    const prediction = predictions.find((item) => item.matchId === matchId);
    if (!prediction) return;
    setSaving(true);
    try {
      if (!USE_MOCKS && supabase) {
        const { error } = await supabase.rpc('save_prediction_match_score', {
          p_ticket_id: ticketId,
          p_match_id: matchId,
          p_home_score: prediction.homeScore,
          p_away_score: prediction.awayScore,
          p_penalty_winner_team_id: prediction.penaltyWinnerTeamId ?? null
        });
        if (error) throw new Error(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const standings = useMemo(() => calculateGroupStandings(mockTeams, mockMatches, predictions), [predictions]);
  const qualified = useMemo(() => getQualifiedTeams(standings), [standings]);
  const progress = useMemo(() => calculateProgress(predictions, mockMatches.length), [predictions]);

  return { teams: mockTeams, matches: mockMatches, predictions, setScore, saveScore, standings, qualified, progress, saving };
}
