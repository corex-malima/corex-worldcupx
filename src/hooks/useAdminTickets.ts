import { useEffect, useMemo, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export interface AdminTicketRow {
  id: string;
  code: string;
  codeMasked: string;
  alias: string;
  personName: string;
  cedula: string;
  areaId: string | null;
  areaName: string | null;
  jobClassificationCode: string | null;
  status: 'sold' | 'claimed' | 'cancelled';
  predictionStatus: 'pending' | 'in_progress' | 'submitted' | 'locked';
  groupsFilled: number;
  points: number;
  claimedAt: string | null;
}

const MOCK_ROWS: AdminTicketRow[] = [
  { id: 'mock-1', code: 'WCX-A1B2C3D4', codeMasked: 'WCX-****', alias: 'Ticket 1', personName: 'David Rivera', cedula: '0102030405', areaId: 'CAMPO', areaName: 'Campo', jobClassificationCode: 'AGRICOLA', status: 'claimed', predictionStatus: 'submitted', groupsFilled: 72, points: 18, claimedAt: new Date().toISOString() },
  { id: 'mock-2', code: 'WCX-F7E8D9CA', codeMasked: 'WCX-****', alias: 'Ticket 2', personName: 'David Rivera', cedula: '0102030405', areaId: 'CAMPO', areaName: 'Campo', jobClassificationCode: 'AGRICOLA', status: 'sold', predictionStatus: 'pending', groupsFilled: 0, points: 0, claimedAt: null },
  { id: 'mock-3', code: 'WCX-K9L0M1N2', codeMasked: 'WCX-****', alias: 'Ticket 1', personName: 'Paola León', cedula: '1700000000', areaId: 'POSCOSECHA', areaName: 'Poscosecha', jobClassificationCode: 'EMPAQUE', status: 'cancelled', predictionStatus: 'pending', groupsFilled: 0, points: 0, claimedAt: null }
];

interface DbRow {
  id: string;
  code: string;
  alias: string;
  status: 'sold' | 'claimed' | 'cancelled';
  cedula: string;
  person_name: string | null;
  area_id: string | null;
  area_name: string | null;
  job_classification_code: string | null;
  prediction_status: string;
  groups_filled: number;
  points: number;
  claimed_at: string | null;
}

function maskCode(code: string): string {
  if (code.length >= 8 && code.startsWith('WCX-')) return `${code.slice(0, 4)}${code.slice(4, 6)}****`;
  return `${code.slice(0, 2)}****`;
}

export function useAdminTickets() {
  const [rows, setRows] = useState<AdminTicketRow[]>(USE_MOCKS ? MOCK_ROWS : []);
  const [loading, setLoading] = useState(!USE_MOCKS && Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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
        .from('v_admin_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (queryError) throw new Error(queryError.message);
      const mapped: AdminTicketRow[] = ((data ?? []) as unknown as DbRow[]).map((r) => ({
        id: r.id,
        code: r.code,
        codeMasked: maskCode(r.code),
        alias: r.alias,
        personName: r.person_name ?? 'Sin nombre',
        cedula: r.cedula,
        areaId: r.area_id,
        areaName: r.area_name,
        jobClassificationCode: r.job_classification_code,
        status: r.status,
        predictionStatus: (['pending', 'in_progress', 'submitted', 'locked'].includes(r.prediction_status) ? r.prediction_status : 'pending') as AdminTicketRow['predictionStatus'],
        groupsFilled: r.groups_filled ?? 0,
        points: r.points ?? 0,
        claimedAt: r.claimed_at
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

  // Filtrado client-side por cédula, nombre o alias.
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const digits = q.replace(/\D/g, '');
    return rows.filter((row) => {
      const name = row.personName.toLowerCase();
      const alias = row.alias.toLowerCase();
      const code = row.code.toLowerCase();
      const cedula = row.cedula;
      if (name.includes(q)) return true;
      if (alias.includes(q)) return true;
      if (code.includes(q)) return true;
      if (digits && cedula.includes(digits)) return true;
      return false;
    });
  }, [query, rows]);

  useEffect(() => {
    void load();
  }, []);

  return { rows: filteredRows, totalCount: rows.length, loading, error, reload: load, cancelTicket, query, setQuery };
}
