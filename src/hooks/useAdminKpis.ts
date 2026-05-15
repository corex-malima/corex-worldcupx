import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export interface AdminKpis {
  ticketsSold: number;
  ticketsClaimed: number;
  predictionsSubmitted: number;
  revenue: number;
}

const MOCK_KPIS: AdminKpis = {
  ticketsSold: 128,
  ticketsClaimed: 94,
  predictionsSubmitted: 71,
  revenue: 640
};

const EMPTY_KPIS: AdminKpis = { ticketsSold: 0, ticketsClaimed: 0, predictionsSubmitted: 0, revenue: 0 };

export function useAdminKpis() {
  const [kpis, setKpis] = useState<AdminKpis>(USE_MOCKS ? MOCK_KPIS : EMPTY_KPIS);
  const [loading, setLoading] = useState(!USE_MOCKS && Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (USE_MOCKS || !supabase) {
      setKpis(MOCK_KPIS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sold, claimed, submitted, revenueRows] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'claimed'),
        supabase.from('prediction_headers').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('tickets').select('purchase_amount').neq('status', 'cancelled')
      ]);

      if (sold.error) throw new Error(sold.error.message);
      if (claimed.error) throw new Error(claimed.error.message);
      if (submitted.error) throw new Error(submitted.error.message);
      if (revenueRows.error) throw new Error(revenueRows.error.message);

      const revenue = (revenueRows.data ?? []).reduce(
        (acc, row) => acc + (typeof row.purchase_amount === 'number' ? row.purchase_amount : 0),
        0
      );

      setKpis({
        ticketsSold: sold.count ?? 0,
        ticketsClaimed: claimed.count ?? 0,
        predictionsSubmitted: submitted.count ?? 0,
        revenue
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas.');
      setKpis(EMPTY_KPIS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return { kpis, loading, error, reload: load };
}
