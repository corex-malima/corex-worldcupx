import { useEffect, useState } from 'react';
import type { Ticket } from '../types/domain';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

const mockTickets: Ticket[] = [
  { id: 'ticket-1', codeMasked: 'A1••••', status: 'claimed', predictionStatus: 'in_progress', points: 18, ownerName: 'David Rivera', areaId: 'CAMPO', claimedAt: new Date().toISOString() },
  { id: 'ticket-2', codeMasked: 'F7••••', status: 'sold', predictionStatus: 'pending', points: 0, ownerName: 'David Rivera', areaId: 'CAMPO' }
];

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    setLoading(true);
    try {
      if (USE_MOCKS || !supabase) {
        setTickets(mockTickets);
      } else {
        const { data, error: queryError } = await supabase.from('v_my_tickets').select('*');
        if (queryError) throw new Error(queryError.message);
        setTickets((data ?? []) as unknown as Ticket[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tickets.');
    } finally {
      setLoading(false);
    }
  }

  async function claimTicket(code: string) {
    if (USE_MOCKS || !supabase) {
      setTickets((current) => [
        ...current,
        { id: `mock-${code}`, codeMasked: `${code.slice(0, 2)}••••`, status: 'claimed', predictionStatus: 'pending', points: 0, ownerName: 'David Rivera', areaId: 'CAMPO', claimedAt: new Date().toISOString() }
      ]);
      return;
    }
    const { error: rpcError } = await supabase.rpc('claim_ticket', { p_code: code });
    if (rpcError) throw new Error(rpcError.message);
    await loadTickets();
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  return { tickets, loading, error, reload: loadTickets, claimTicket };
}
