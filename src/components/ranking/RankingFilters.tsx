import { Filter } from 'lucide-react';

export function RankingFilters({ areas, value, onChange }: { areas: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <Filter size={18} className="text-white/45" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-pitch-900 px-4 text-sm font-bold text-white outline-none">
        <option value="ALL">Todas las áreas</option>
        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
      </select>
    </div>
  );
}
