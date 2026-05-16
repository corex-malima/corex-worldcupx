import { Filter } from 'lucide-react';

interface Props {
  areas: string[];
  classifications: string[];
  areaValue: string;
  classificationValue: string;
  onAreaChange: (value: string) => void;
  onClassificationChange: (value: string) => void;
}

export function RankingFilters({ areas, classifications, areaValue, classificationValue, onAreaChange, onClassificationChange }: Props) {
  const selectClass = "min-h-11 rounded-2xl border border-white/10 bg-pitch-900 px-4 text-sm font-bold text-white outline-none";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-pitch-900 p-4">
      <Filter size={18} className="text-white/45" />
      <select value={areaValue} onChange={(event) => onAreaChange(event.target.value)} className={selectClass}>
        <option value="ALL">Todas las áreas</option>
        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
      </select>
      <select value={classificationValue} onChange={(event) => onClassificationChange(event.target.value)} className={selectClass}>
        <option value="ALL">Todas las clasificaciones</option>
        {classifications.map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
    </div>
  );
}
