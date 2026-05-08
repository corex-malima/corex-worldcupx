import { useEffect, useMemo, useState } from 'react';
import type { RankingRow } from '../types/domain';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { mockRanking } from '../data/mock/ranking';

export function useRanking() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (USE_MOCKS || !supabase) {
        setRows(mockRanking);
      } else {
        const { data, error } = await supabase.from('v_ranking_public').select('*');
        if (error) throw new Error(error.message);
        const mapped = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
          rank: Number(row.rank ?? 0),
          ticketId: String(row.ticket_id ?? ''),
          alias: String(row.alias ?? ''),
          employeeName: String(row.employee_name ?? ''),
          areaId: String(row.area_id ?? ''),
          points: Number(row.points ?? 0),
          exactCount: Number(row.exact_count ?? 0),
          resultCount: Number(row.result_count ?? 0),
          bonusPoints: Number(row.bonus_points ?? 0),
          status: String(row.status ?? 'pending') as RankingRow['status']
        }));
        setRows(mapped);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    if (areaFilter === 'ALL') return rows;
    return rows.filter((row) => row.areaId === areaFilter);
  }, [rows, areaFilter]);

  const areas = useMemo(() => Array.from(new Set(rows.map((row) => row.areaId))).filter(Boolean), [rows]);

  return { rows: filteredRows, allRows: rows, areas, areaFilter, setAreaFilter, loading };
}
