import type { Match, ScorePrediction } from '../types/tournament';

export interface MatchScoreResult {
  points: number;
  exact: boolean;
  result: boolean;
}

function outcome(home: number, away: number): 'H' | 'D' | 'A' {
  if (home > away) return 'H';
  if (home < away) return 'A';
  return 'D';
}

export function scoreGroupMatch(actual: Match, prediction: ScorePrediction): MatchScoreResult {
  if (actual.homeScore === null || actual.homeScore === undefined || actual.awayScore === null || actual.awayScore === undefined) {
    return { points: 0, exact: false, result: false };
  }
  if (prediction.homeScore === null || prediction.homeScore === undefined || prediction.awayScore === null || prediction.awayScore === undefined) {
    return { points: 0, exact: false, result: false };
  }

  const exact = actual.homeScore === prediction.homeScore && actual.awayScore === prediction.awayScore;
  if (exact) return { points: 3, exact: true, result: true };

  const result = outcome(actual.homeScore, actual.awayScore) === outcome(prediction.homeScore, prediction.awayScore);
  return { points: result ? 1 : 0, exact: false, result };
}

export function calculateProgress(predictions: ScorePrediction[], totalMatches: number): number {
  if (!totalMatches) return 0;
  const completed = predictions.filter((prediction) => prediction.homeScore !== null && prediction.awayScore !== null).length;
  return Math.round((completed / totalMatches) * 100);
}
