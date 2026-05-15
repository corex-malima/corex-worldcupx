import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export interface TicketPredictionScoreRow {
  match_id: string;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: string | null;
  winner_team_id: string | null;
}

export interface TicketPredictionThirdRow {
  slot_match_id: string;
  team_id: string;
}

export interface TicketPredictionBundle {
  ticketId: string;
  ticketCode: string | null;
  ownerName: string | null;
  predictionId: string | null;
  status: string | null;
  championTeamId: string | null;
  thirdPlaceTeamId: string | null;
  groupScores: TicketPredictionScoreRow[];
  knockoutScores: TicketPredictionScoreRow[];
  thirdPlaceAssignments: TicketPredictionThirdRow[];
}

const EMPTY: TicketPredictionBundle = {
  ticketId: '',
  ticketCode: null,
  ownerName: null,
  predictionId: null,
  status: null,
  championTeamId: null,
  thirdPlaceTeamId: null,
  groupScores: [],
  knockoutScores: [],
  thirdPlaceAssignments: []
};

/**
 * Carga la predicción completa de un ticket específico (todos sus marcadores +
 * asignaciones de mejores terceros + campeón/tercer puesto). Solo accesible para
 * el dueño del ticket o un admin (RLS en BD lo controla).
 *
 * Usado por:
 *   - Plantillas PDF por ticket (resolver R32 con grupos del ticket).
 *   - Modo admin de edición de predicción (PredictionWizard adminMode).
 */
export function useTicketPrediction(ticketId: string | null | undefined) {
  const [data, setData] = useState<TicketPredictionBundle>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!ticketId) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    if (USE_MOCKS || !supabase) {
      setData({ ...EMPTY, ticketId });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ticketRes = await supabase
        .from('tickets')
        .select('id, code, person_name, employee_id')
        .eq('id', ticketId)
        .maybeSingle();
      if (ticketRes.error) throw new Error(ticketRes.error.message);

      const headerRes = await supabase
        .from('prediction_headers')
        .select('id, status, champion_team_id, third_place_team_id')
        .eq('ticket_id', ticketId)
        .maybeSingle();
      if (headerRes.error) throw new Error(headerRes.error.message);

      const predictionId = headerRes.data?.id ?? null;

      let groupScores: TicketPredictionScoreRow[] = [];
      let knockoutScores: TicketPredictionScoreRow[] = [];
      let thirds: TicketPredictionThirdRow[] = [];

      if (predictionId) {
        const scoresRes = await supabase
          .from('prediction_match_scores')
          .select('match_id, stage, home_team_id, away_team_id, home_score, away_score, penalty_winner_team_id, winner_team_id')
          .eq('prediction_id', predictionId);
        if (scoresRes.error) throw new Error(scoresRes.error.message);
        const allScores = (scoresRes.data ?? []) as TicketPredictionScoreRow[];
        groupScores = allScores.filter((s) => s.stage === 'GROUP');
        knockoutScores = allScores.filter((s) => s.stage !== 'GROUP');

        const thirdsRes = await supabase
          .from('prediction_third_place_assignments')
          .select('slot_match_id, team_id')
          .eq('prediction_id', predictionId);
        if (thirdsRes.error) throw new Error(thirdsRes.error.message);
        thirds = (thirdsRes.data ?? []) as TicketPredictionThirdRow[];
      }

      setData({
        ticketId,
        ticketCode: ticketRes.data?.code ?? null,
        ownerName: ticketRes.data?.person_name ?? null,
        predictionId,
        status: headerRes.data?.status ?? null,
        championTeamId: headerRes.data?.champion_team_id ?? null,
        thirdPlaceTeamId: headerRes.data?.third_place_team_id ?? null,
        groupScores,
        knockoutScores,
        thirdPlaceAssignments: thirds
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la predicción.');
      setData({ ...EMPTY, ticketId });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  return { data, loading, error, reload: load };
}
