import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface EmployeeTicketStats {
  ticketsSold: number;
  ticketsClaimed: number;
  ticketsPending: number;
}

const EMPTY: EmployeeTicketStats = { ticketsSold: 0, ticketsClaimed: 0, ticketsPending: 0 };

interface UseEmployeeTicketStatsParams {
  cedula?: string | null;
  personId?: string | null;
}

interface InternalState {
  stats: EmployeeTicketStats;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: InternalState = { stats: EMPTY, loading: false, error: null };

/**
 * Carga los contadores Vendidos/Reclamados/Pendientes para el colaborador
 * seleccionado en el panel de ventas. Lee de la view v_employee_ticket_stats
 * que cuenta tickets por employee_id.
 *
 * Estado consolidado en un solo objeto para que el useEffect haga 1 setState
 * por transición (no encadenando setStats + setLoading + setError).
 */
export function useEmployeeTicketStats({ cedula, personId }: UseEmployeeTicketStatsParams) {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    const cleanCedula = (cedula ?? '').replace(/\D/g, '');
    const cleanPerson = (personId ?? '').trim();

    if (!cleanCedula && !cleanPerson) {
      setState(INITIAL_STATE);
      return;
    }

    if (USE_MOCKS || !supabase) {
      setState(INITIAL_STATE);
      return;
    }

    setState({ stats: EMPTY, loading: true, error: null });

    (async () => {
      // Guard sincrónico: si el efecto ya se canceló antes de iniciar el fetch
      // (re-render rápido), no disparamos la query.
      if (cancelled) return;
      const query = supabase.from('v_employee_ticket_stats').select('tickets_sold,tickets_claimed,tickets_pending,cedula,person_id');
      const filtered = cleanCedula ? query.eq('cedula', cleanCedula) : query.eq('person_id', cleanPerson);
      const { data, error: queryError } = await filtered.maybeSingle();

      // Guard post-await: la suscripción se canceló durante la query
      if (cancelled) return;

      if (queryError) {
        setState({ stats: EMPTY, loading: false, error: queryError.message });
      } else if (!data) {
        setState({ stats: EMPTY, loading: false, error: null });
      } else {
        setState({
          stats: {
            ticketsSold: data.tickets_sold ?? 0,
            ticketsClaimed: data.tickets_claimed ?? 0,
            ticketsPending: data.tickets_pending ?? 0
          },
          loading: false,
          error: null
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cedula, personId]);

  return { stats: state.stats, loading: state.loading, error: state.error };
}
