import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

export function AdminMetricCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest text-corex-ink/45">{label}</p><p className="mt-1 text-3xl font-black text-corex-ink">{value}</p></div>
        <span className="grid size-12 place-items-center rounded-xl border border-cup-blue/20 bg-pitch-800 text-cup-blue">{icon}</span>
      </div>
    </Card>
  );
}
