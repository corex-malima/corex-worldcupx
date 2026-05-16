import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export interface ScoreDetailRow {
  category: string;
  item_ref: string | null;
  points: number;
  detail: Record<string, unknown>;
}

export interface TicketScoreRow {
  total_points: number;
  group_match_points: number;
  group_position_points: number;
  knockout_points: number;
  cross_points: number;
  advancement_points: number;
  champion_bonus: number;
  runner_up_bonus: number;
  exact_count: number;
  result_count: number;
  calculated_at: string | null;
}

export interface TicketBreakdownBundle {
  ticketId: string;
  alias: string;
  ownerName: string | null;
  areaName: string | null;
  status: string | null;
  total: TicketScoreRow | null;
  details: ScoreDetailRow[];
}

const EMPTY: TicketBreakdownBundle = {
  ticketId: '',
  alias: '',
  ownerName: null,
  areaName: null,
  status: null,
  total: null,
  details: []
};

export function useTicketBreakdown(ticketId: string | null) {
  const [data, setData] = useState<TicketBreakdownBundle>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!ticketId) {
      setData(EMPTY);
      return;
    }
    if (USE_MOCKS || !supabase) {
      setData({ ...EMPTY, ticketId, alias: 'Ticket demo', ownerName: 'Demo Mock', status: 'submitted' });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ticketRes, scoreRes, detailsRes] = await Promise.all([
        supabase
          .from('v_admin_tickets')
          .select('id, alias, person_name, area_name, prediction_status')
          .eq('id', ticketId)
          .maybeSingle(),
        supabase
          .from('ticket_scores')
          .select('total_points, group_match_points, group_position_points, knockout_points, cross_points, advancement_points, champion_bonus, runner_up_bonus, exact_count, result_count, calculated_at')
          .eq('ticket_id', ticketId)
          .maybeSingle(),
        supabase
          .from('score_details')
          .select('category, item_ref, points, detail')
          .eq('ticket_id', ticketId)
          .order('category')
      ]);

      if (ticketRes.error) throw new Error(ticketRes.error.message);
      if (scoreRes.error) throw new Error(scoreRes.error.message);
      if (detailsRes.error) throw new Error(detailsRes.error.message);

      setData({
        ticketId,
        alias: ticketRes.data?.alias ?? `Ticket ${ticketId.slice(0, 8)}`,
        ownerName: ticketRes.data?.person_name ?? null,
        areaName: ticketRes.data?.area_name ?? null,
        status: ticketRes.data?.prediction_status ?? null,
        total: (scoreRes.data as TicketScoreRow | null) ?? null,
        details: (detailsRes.data ?? []) as ScoreDetailRow[]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle.');
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
