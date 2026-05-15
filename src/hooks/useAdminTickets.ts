import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { maskTicketCode } from '../lib/format';

export interface AdminTicketRow {
  id: string;
  codeMasked: string;
  personName: string;
  areaId: string | null;
  areaName: string | null;
  status: 'sold' | 'claimed' | 'cancelled';
  points: number;
  claimedAt: string | null;
}

const MOCK_ROWS: AdminTicketRow[] = [
  { id: 'mock-1', codeMasked: 'A1****', personName: 'David Rivera', areaId: 'CAMPO', areaName: 'Campo', status: 'claimed', points: 18, claimedAt: new Date().toISOString() },
  { id: 'mock-2', codeMasked: 'F7****', personName: 'David Rivera', areaId: 'CAMPO', areaName: 'Campo', status: 'sold', points: 0, claimedAt: null },
  { id: 'mock-3', codeMasked: 'K9****', personName: 'Paola León', areaId: 'POSCOSECHA', areaName: 'Poscosecha', status: 'cancelled', points: 0, claimedAt: null }
];

interface DbRow {
  id: string;
  code: string;
  status: 'sold' | 'claimed' | 'cancelled';
  person_name: string | null;
  area_id: string | null;
  area_name: string | null;
  claimed_at: string | null;
  ticket_scores: { total_points: number | null }[] | null;
}

export function useAdminTickets() {
  const [rows, setRows] = useState<AdminTicketRow[]>(USE_MOCKS ? MOCK_ROWS : []);
  const [loading, setLoading] = useState(!USE_MOCKS && Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (USE_MOCKS || !supabase) {
      setRows(MOCK_ROWS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('tickets')
        .select('id, code, status, person_name, area_id, area_name, claimed_at, ticket_scores(total_points)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (queryError) throw new Error(queryError.message);

      const mapped: AdminTicketRow[] = ((data ?? []) as unknown as DbRow[]).map((row) => ({
        id: row.id,
        codeMasked: maskTicketCode(row.code),
        personName: row.person_name ?? 'Sin nombre',
        areaId: row.area_id,
        areaName: row.area_name,
        status: row.status,
        points: row.ticket_scores?.[0]?.total_points ?? 0,
        claimedAt: row.claimed_at
      }));
      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tickets.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function cancelTicket(ticketId: string, reason: string) {
    if (USE_MOCKS || !supabase) {
      setRows((current) => current.map((row) => row.id === ticketId ? { ...row, status: 'cancelled' as const } : row));
      return;
    }
    const { error: rpcError } = await supabase.rpc('cancel_ticket', { p_ticket_id: ticketId, p_reason: reason });
    if (rpcError) throw new Error(rpcError.message);
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  return { rows, loading, error, reload: load, cancelTicket };
}
