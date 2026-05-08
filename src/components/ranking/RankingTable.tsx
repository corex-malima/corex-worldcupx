import { useState } from 'react';
import type { RankingRow } from '../../types/domain';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ScoreBreakdownModal } from './ScoreBreakdownModal';

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  const [selected, setSelected] = useState<RankingRow | null>(null);
  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-white/10 text-left text-white/50">
              <tr><th className="p-4">#</th><th>Ticket</th><th>Colaborador</th><th>Área</th><th>Puntos</th><th>Exactos</th><th>Resultado</th><th>Bonus</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ticketId} className="border-t border-white/10 text-white/80">
                  <td className="p-4 font-black">{row.rank}</td>
                  <td className="font-bold">{row.alias}</td>
                  <td>{row.employeeName}</td>
                  <td><Badge tone="blue">{row.areaId}</Badge></td>
                  <td className="font-black text-cup-gold">{row.points}</td>
                  <td>{row.exactCount}</td>
                  <td>{row.resultCount}</td>
                  <td>{row.bonusPoints}</td>
                  <td><Button variant="ghost" onClick={() => setSelected(row)}>Ver</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ScoreBreakdownModal row={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </>
  );
}
