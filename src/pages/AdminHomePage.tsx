import { ClipboardCheck, DollarSign, Ticket, Trophy } from 'lucide-react';
import { AdminMetricCard } from '../components/admin/AdminMetricCard';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function AdminHomePage({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div><p className="text-xs font-black uppercase tracking-widest text-cup-gold">Panel TTHH</p><h1 className="text-3xl font-black text-white">Panel de control TTHH</h1></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Tickets vendidos" value={128} icon={<Ticket />} />
          <AdminMetricCard label="Tickets reclamados" value={94} icon={<ClipboardCheck />} />
          <AdminMetricCard label="Predicciones enviadas" value={71} icon={<Trophy />} />
          <AdminMetricCard label="Recaudado opcional" value="$640" icon={<DollarSign />} />
        </div>
        <Card>
          <h2 className="text-xl font-black text-white">Accesos rápidos</h2>
          <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => onNavigate('#/admin/sales')}>Agregar compra</Button><Button variant="secondary" onClick={() => onNavigate('#/admin/results')}>Cargar resultados</Button><Button variant="secondary" onClick={() => onNavigate('#/ranking')}>Ver ranking</Button></div>
        </Card>
      </div>
    </div>
  );
}
