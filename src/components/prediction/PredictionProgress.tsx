export function PredictionProgress({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900 p-4">
      <div className="mb-2 flex justify-between text-sm font-bold text-white/70"><span>Progreso de predicción</span><span>{value}%</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-pitch-800">
        <div className="h-full rounded-full bg-cup-blue transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
