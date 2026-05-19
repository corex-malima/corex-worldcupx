import type { Match } from '../../types/tournament';
import type { PredictedBracketMatch, ThirdPlaceSlot } from '../../types/prediction';
import type { TicketPredictionBundle } from '../../hooks/useTicketPrediction';
import { buildInitialBracket, createThirdPlaceSlots } from '../bracketBuilder';

export interface ReceiptInputs {
  groupScoresByMatch: Record<string, { homeScore: number | null; awayScore: number | null }>;
  thirdPlaceSlots: ThirdPlaceSlot[];
  bracketMatches: PredictedBracketMatch[];
}

/**
 * Convierte el TicketPredictionBundle (formato de BD) al formato que espera
 * PredictionReceiptDocument. Reusa la misma lógica que usePrediction.ts:109-146
 * para mantener consistencia entre el comprobante del usuario y el del admin.
 *
 * Crítico: nunca calcula standings — solo overlay de los scores ya guardados
 * por la predicción. El bracket sale del fixture + asignaciones de terceros +
 * scores knockout, en ese orden.
 */
export function bundleToReceiptInputs(
  bundle: TicketPredictionBundle,
  fixtureMatches: Match[]
): ReceiptInputs {
  // 1) groupScoresByMatch
  const groupScoresByMatch: Record<string, { homeScore: number | null; awayScore: number | null }> = {};
  bundle.groupScores.forEach((s) => {
    groupScoresByMatch[s.match_id] = { homeScore: s.home_score, awayScore: s.away_score };
  });

  // 2) thirdPlaceSlots con assignments hidratadas
  const knockoutMatches = fixtureMatches.filter((m) => m.stage !== 'GROUP');
  const slots = createThirdPlaceSlots(knockoutMatches);
  const hydratedSlots = slots.map((slot) => {
    const match = knockoutMatches.find((m) => m.matchNo === slot.matchNo);
    if (!match) return slot;
    const assignment = bundle.thirdPlaceAssignments.find((a) => a.slot_match_id === match.id);
    return assignment ? { ...slot, assignedTeamId: assignment.team_id } : slot;
  });

  // 3) bracketMatches: build inicial + overlay de knockoutScores con teams/scores/winner
  const initialBracket = buildInitialBracket(knockoutMatches, [], hydratedSlots);
  const bracketMatches = initialBracket.map((m) => {
    const score = bundle.knockoutScores.find((s) => s.match_id === m.id);
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

  return { groupScoresByMatch, thirdPlaceSlots: hydratedSlots, bracketMatches };
}
