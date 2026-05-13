import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

export function AdminMetricCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest text-white/45">{label}</p><p className="mt-1 text-3xl font-black text-white">{value}</p></div>
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-cup-blue/20 bg-pitch-800 text-cup-blue">{icon}</span>
      </div>
    </Card>
  );
}
