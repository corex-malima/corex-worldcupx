import { useEffect, useMemo, useState } from 'react';
import type { RankingRow } from '../types/domain';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { mockRanking } from '../data/mock/ranking';

export function useRanking() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (USE_MOCKS || !supabase) {
        setRows(mockRanking);
      } else {
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
        setRows(mapped);
      }
      setLoading(false);
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
