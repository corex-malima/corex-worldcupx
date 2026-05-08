export function PredictionProgress({ value }: { value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-2 flex justify-between text-sm font-bold text-white/70"><span>Progreso de predicción</span><span>{value}%</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cup-green to-cup-gold transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
