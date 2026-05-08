import { Crown, Medal } from 'lucide-react';
import type { RankingRow } from '../../types/domain';

export function RankingPodium({ rows }: { rows: RankingRow[] }) {
  const top = rows.slice(0, 3);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {top.map((row, index) => (
        <div key={row.ticketId} className={`rounded-3xl border border-white/10 bg-white/[0.08] p-5 text-center shadow-2xl ${index === 0 ? 'md:-translate-y-3 bg-cup-gold/15' : ''}`}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-cup-gold">{index === 0 ? <Crown /> : <Medal />}</div>
          <p className="mt-3 text-sm font-black uppercase tracking-widest text-white/45">Puesto {row.rank}</p>
          <h3 className="mt-1 text-xl font-black text-white">{row.employeeName}</h3>
          <p className="text-sm text-white/60">{row.alias} · {row.areaId}</p>
          <p className="mt-3 text-3xl font-black text-cup-gold">{row.points} pts</p>
        </div>
      ))}
    </div>
  );
}
