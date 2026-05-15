import { useMemo } from 'react';
import { TicketAdminTable } from '../components/admin/TicketAdminTable';
import { ExportCsvButton } from '../components/admin/ExportCsvButton';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { useAdminTickets } from '../hooks/useAdminTickets';

export function AdminTicketsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { rows, loading, error, cancelTicket } = useAdminTickets();
  const csvRows = useMemo(() => rows.map((row) => ({
    codigo: row.codeMasked,
    colaborador: row.personName,
    area: row.areaName ?? row.areaId ?? '',
    estado: row.status,
    puntos: row.points,
    reclamado_en: row.claimedAt ?? ''
  })), [rows]);

  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Control</p>
            <h1 className="text-3xl font-black text-white">Tickets vendidos y reclamados</h1>
          </div>
          <ExportCsvButton filename="tickets.csv" rows={csvRows} />
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <TicketAdminTable rows={rows} loading={loading} error={error} onCancel={cancelTicket} onEdit={(id) => onNavigate(`#/admin/tickets/${id}/edit`)} />
        </div>
      </div>
    </div>
  );
}
