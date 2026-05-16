import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { TicketAdminTable } from '../components/admin/TicketAdminTable';
import { ExportCsvButton } from '../components/admin/ExportCsvButton';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Input } from '../components/ui/Input';
import { useAdminTickets } from '../hooks/useAdminTickets';

export function AdminTicketsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { rows, totalCount, loading, error, cancelTicket, query, setQuery } = useAdminTickets();
  const csvRows = useMemo(() => rows.map((row) => ({
    alias: row.alias,
    codigo: row.code,
    colaborador: row.personName,
    cedula: row.cedula,
    area: row.areaName ?? row.areaId ?? '',
    clasificacion: row.jobClassificationCode ?? '',
    estado: row.status,
    grupos_predichos: row.groupsFilled,
    puntos: row.points,
    reclamado_en: row.claimedAt ?? ''
  })), [rows]);

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Control</p>
            <h1 className="text-3xl font-black text-white">Tickets vendidos y reclamados</h1>
          </div>
          <ExportCsvButton filename="tickets.csv" rows={csvRows} />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Input
            label="Buscar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cédula · Nombre · Alias (ej. Ticket 1) · Código WCX"
            icon={<Search size={17} />}
            helper={`${rows.length.toLocaleString('es-EC')} de ${totalCount.toLocaleString('es-EC')} tickets visibles`}
          />
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <TicketAdminTable rows={rows} loading={loading} error={error} onCancel={cancelTicket} onEdit={(id) => onNavigate(`#/admin/tickets/${id}/edit`)} />
        </div>
      </div>
    </div>
  );
}
