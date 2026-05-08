import { TicketAdminTable } from '../components/admin/TicketAdminTable';
import { ExportCsvButton } from '../components/admin/ExportCsvButton';
import { AdminSidebar } from '../components/layout/AdminSidebar';

export function AdminTicketsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-cup-gold">Control</p><h1 className="text-3xl font-black text-white">Tickets vendidos y reclamados</h1></div><ExportCsvButton filename="tickets.csv" rows={[{ticket:'A1••••', estado:'claimed'}]} /></div>
        <div className="overflow-x-auto scrollbar-thin"><TicketAdminTable /></div>
      </div>
    </div>
  );
}
