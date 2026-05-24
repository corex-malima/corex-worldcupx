import { Tv, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { useTournamentStats } from '../../hooks/useTournamentStats';

const MILESTONES = [
  { threshold: 250, label: '250', stars: 1, iconSize: 18, prizeLabel: 'TV nivel 1' },
  { threshold: 500, label: '500', stars: 2, iconSize: 22, prizeLabel: 'TV nivel 2' },
  { threshold: 750, label: '750', stars: 3, iconSize: 26, prizeLabel: 'TV nivel 3' },
  { threshold: 1000, label: '1000+', stars: 4, iconSize: 30, prizeLabel: '¡Mejor premio!' }
] as const;

export function TicketSalesProgress() {
  const { data, loading } = useTournamentStats();
  if (loading) return null;

  const total = data.totalSold;
  const progressPct = Math.min((total / 1000) * 100, 100);
  const reachedAll = total >= 1000;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-cup-blue">
          🏆 Premios por tickets vendidos
        </p>
        <p className="text-xs font-bold text-corex-ink/70">
          <span className="text-base text-corex-ink">{total}</span> / 1000+ tickets
        </p>
      </div>

      {/* Barra */}
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-corex-paper">
        <div
          className="h-full rounded-full bg-gradient-to-r from-corex-signal to-corex-signalSoft transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Milestones */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MILESTONES.map((m) => {
          const reached = total >= m.threshold;
          const isNext = !reached && MILESTONES.findIndex((x) => total < x.threshold) === MILESTONES.indexOf(m);
          return (
            <div
              key={m.threshold}
              className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition ${
                reached
                  ? 'border-corex-signal/40 bg-corex-signalFog/60'
                  : isNext
                    ? 'border-corex-signal/20 bg-corex-paper'
                    : 'border-corex-ink/10 bg-corex-paper/50 opacity-60'
              }`}
            >
              <Tv
                size={m.iconSize}
                className={reached ? 'text-corex-signal' : 'text-corex-ink/40'}
              />
              <div className="flex gap-0.5">
                {Array.from({ length: m.stars }).map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={reached ? 'text-corex-signal' : 'text-corex-ink/30'}
                    fill={reached ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <p className={`text-xs font-black ${reached ? 'text-corex-ink' : 'text-corex-ink/55'}`}>
                {m.label}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${reached ? 'text-cup-blue' : 'text-corex-ink/40'}`}>
                {reached ? '✓ logrado' : isNext ? 'Siguiente' : 'Pendiente'}
              </p>
            </div>
          );
        })}
      </div>

      {reachedAll && (
        <p className="mt-3 text-center text-xs font-bold text-corex-signal">
          🎁 ¡Meta máxima superada! La polla sigue creciendo: mientras más tickets se vendan, mejor el premio.
        </p>
      )}
    </Card>
  );
}
