import type { RankingRow } from '../../types/domain';
import { Modal } from '../ui/Modal';

export function ScoreBreakdownModal({ row, open, onClose }: { row: RankingRow | null; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Detalle de puntos">
      {row && (
        <div className="space-y-3 text-white/80">
          <p className="text-lg font-black text-white">{row.employeeName} · {row.alias}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/45">Marcadores exactos</p><p className="text-2xl font-black">{row.exactCount}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/45">Resultados</p><p className="text-2xl font-black">{row.resultCount}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/45">Bonus</p><p className="text-2xl font-black">{row.bonusPoints}</p></div>
          </div>
          <p className="text-sm text-white/60">En Supabase, este detalle se alimenta desde `v_ticket_score_breakdown` y `score_details`.</p>
        </div>
      )}
    </Modal>
  );
}
