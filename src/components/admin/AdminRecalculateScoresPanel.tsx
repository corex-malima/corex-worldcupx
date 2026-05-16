import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export function AdminRecalculateScoresPanel({ status, processed, updatedAt, onRecalculate }: {
  status: 'pending' | 'calculating' | 'calculated' | 'error';
  processed: number;
  updatedAt: string | null;
  onRecalculate: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Ranking</p>
          <h3 className="text-xl font-semibold text-white">Recalcular ranking mock</h3>
          <p className="mt-1 text-sm text-white/60">{updatedAt ? `Último cálculo: ${new Date(updatedAt).toLocaleString()}` : 'Aún no hay cálculo registrado.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={status === 'calculated' ? 'green' : status === 'error' ? 'red' : 'gold'}>{status}</Badge>
          <Badge tone="blue">{processed} tickets</Badge>
          <Button onClick={onRecalculate} icon={<RefreshCw size={17} />}>Recalcular ranking</Button>
        </div>
      </div>
    </Card>
  );
}
