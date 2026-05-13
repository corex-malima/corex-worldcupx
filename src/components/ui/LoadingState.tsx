export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-white/10 bg-pitch-900 p-6 text-white/70">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulseSoft rounded-full bg-cup-blue" />
        <span className="font-bold">{label}</span>
      </div>
    </div>
  );
}
