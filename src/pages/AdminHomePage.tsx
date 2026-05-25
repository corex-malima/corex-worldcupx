import { ClipboardCheck, Ticket, Trophy } from 'lucide-react';
import { AdminMetricCard } from '../components/admin/AdminMetricCard';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { InfoButton } from '../components/ui/InfoButton';
import { TicketSalesProgress } from '../components/dashboard/TicketSalesProgress';
import { useAdminKpis } from '../hooks/useAdminKpis';
import { help } from '../lib/help/helpContent';

export function AdminHomePage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { kpis, loading, error, reload } = useAdminKpis();

  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Panel TTHH</p>
            <h1 className="text-3xl font-semibold text-corex-ink">
              Panel de control TTHH
              <InfoButton title={help.adminSummary.title} className="ml-2 align-middle">{help.adminSummary.body}</InfoButton>
            </h1>
          </div>
          <Button variant="secondary" onClick={() => void reload()} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</Button>
        </div>
        {error && (
          <p className="rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-cup-red">{error}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminMetricCard label="Tickets vendidos" value={kpis.ticketsSold} icon={<Ticket />} />
          <AdminMetricCard label="Tickets reclamados" value={kpis.ticketsClaimed} icon={<ClipboardCheck />} />
          <AdminMetricCard label="Predicciones enviadas" value={kpis.predictionsSubmitted} icon={<Trophy />} />
        </div>

        <TicketSalesProgress total={kpis.ticketsSold} />
        <Card>
          <h2 className="text-xl font-semibold text-corex-ink">Accesos rápidos</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => onNavigate('#/admin/sales')}>Agregar compra</Button>
            <Button variant="secondary" onClick={() => onNavigate('#/admin/results')}>Cargar resultados</Button>
            <Button variant="secondary" onClick={() => onNavigate('#/ranking')}>Ver ranking</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
