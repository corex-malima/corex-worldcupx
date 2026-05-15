import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export interface EmployeeTicketStats {
  ticketsSold: number;
  ticketsClaimed: number;
  ticketsPending: number;
}

const EMPTY: EmployeeTicketStats = { ticketsSold: 0, ticketsClaimed: 0, ticketsPending: 0 };

interface UseEmployeeTicketStatsParams {
  cedula?: string | null;
  personId?: string | null;
}

/**
 * Carga los contadores Vendidos/Reclamados/Pendientes para el colaborador
 * seleccionado en el panel de ventas. Lee de la view v_employee_ticket_stats
 * que cuenta tickets por employee_id.
 */
export function useEmployeeTicketStats({ cedula, personId }: UseEmployeeTicketStatsParams) {
  const [stats, setStats] = useState<EmployeeTicketStats>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanCedula = (cedula ?? '').replace(/\D/g, '');
    const cleanPerson = (personId ?? '').trim();

    if (!cleanCedula && !cleanPerson) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    if (USE_MOCKS || !supabase) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      const query = supabase.from('v_employee_ticket_stats').select('tickets_sold,tickets_claimed,tickets_pending,cedula,person_id');
      const filtered = cleanCedula ? query.eq('cedula', cleanCedula) : query.eq('person_id', cleanPerson);
      const { data, error: queryError } = await filtered.maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setStats(EMPTY);
      } else if (!data) {
        setStats(EMPTY);
      } else {
        setStats({
          ticketsSold: data.tickets_sold ?? 0,
          ticketsClaimed: data.tickets_claimed ?? 0,
          ticketsPending: data.tickets_pending ?? 0
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [cedula, personId]);

  return { stats, loading, error };
}
