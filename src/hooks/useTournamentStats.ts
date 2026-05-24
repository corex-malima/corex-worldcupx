import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface TournamentStats {
  totalSold: number;
  totalClaimed: number;
  totalPending: number;
  totalCancelled: number;
}

const EMPTY: TournamentStats = { totalSold: 0, totalClaimed: 0, totalPending: 0, totalCancelled: 0 };

/**
 * Contadores globales de tickets para mostrar progreso/incentivos.
 * Lee la view pública v_tournament_stats (grant a anon + authenticated).
 * En USE_MOCKS retorna un mock razonable para visualización.
 */
export function useTournamentStats() {
  const [data, setData] = useState<TournamentStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (USE_MOCKS || !supabase) {
      // Mock: 234 vendidos para visualizar el progreso
      setData({ totalSold: 234, totalClaimed: 180, totalPending: 54, totalCancelled: 3 });
      setLoading(false);
      return;
    }
    (async () => {
      const { data: row } = await supabase
        .from('v_tournament_stats')
        .select('total_tickets_sold, total_tickets_claimed, total_tickets_pending, total_tickets_cancelled')
        .maybeSingle();
      if (cancelled) return;
      if (row) {
        setData({
          totalSold: (row.total_tickets_sold as number) ?? 0,
          totalClaimed: (row.total_tickets_claimed as number) ?? 0,
          totalPending: (row.total_tickets_pending as number) ?? 0,
          totalCancelled: (row.total_tickets_cancelled as number) ?? 0
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
