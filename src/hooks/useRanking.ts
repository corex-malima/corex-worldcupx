import { useEffect, useMemo, useState } from 'react';
import type { RankingRow } from '../types/domain';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { mockRanking } from '../data/mock/ranking';

interface RankingState {
  rows: RankingRow[];
  loading: boolean;
}

export function useRanking() {
  // Consolidamos rows + loading en un solo state object para que el useEffect
  // de carga haga UN solo setState en vez de encadenar setLoading + setRows.
  const [{ rows, loading }, setRankingState] = useState<RankingState>({ rows: [], loading: true });
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');

  useEffect(() => {
    async function load() {
      if (USE_MOCKS || !supabase) {
        setRankingState({ rows: mockRanking, loading: false });
        return;
      }
      const { data, error } = await supabase.from('v_ranking_public').select('*').order('rank');
      if (error) throw new Error(error.message);
      const mapped = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        rank: Number(row.rank ?? 0),
        ticketId: String(row.ticket_id ?? ''),
        alias: String(row.alias ?? ''),
        employeeName: String(row.employee_name ?? ''),
        areaId: String(row.area_id ?? ''),
        areaName: row.area_name ? String(row.area_name) : null,
        jobClassificationCode: row.job_classification_code ? String(row.job_classification_code) : null,
        points: Number(row.points ?? 0),
        exactCount: Number(row.exact_count ?? 0),
        resultCount: Number(row.result_count ?? 0),
        bonusPoints: Number(row.bonus_points ?? 0),
        status: String(row.status ?? 'pending') as RankingRow['status']
      }));
      setRankingState({ rows: mapped, loading: false });
    }
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (areaFilter !== 'ALL' && row.areaId !== areaFilter) return false;
      if (classificationFilter !== 'ALL' && row.jobClassificationCode !== classificationFilter) return false;
      return true;
    });
  }, [rows, areaFilter, classificationFilter]);

  const areas = useMemo(() => Array.from(new Set(rows.map((row) => row.areaId))).filter(Boolean).sort(), [rows]);
  const classifications = useMemo(() => Array.from(new Set(rows.map((row) => row.jobClassificationCode))).filter((v): v is string => Boolean(v)).sort(), [rows]);

  return {
    rows: filteredRows,
    allRows: rows,
    areas,
    classifications,
    areaFilter,
    setAreaFilter,
    classificationFilter,
    setClassificationFilter,
    loading
  };
}
