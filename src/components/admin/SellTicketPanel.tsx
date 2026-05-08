import { useState } from 'react';
import { TicketPlus } from 'lucide-react';
import type { EmployeeSearchResult } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TicketReceipt } from '../tickets/TicketReceipt';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function SellTicketPanel({ employee }: { employee: EmployeeSearchResult | null }) {
  const [lastCode, setLastCode] = useState<string | null>(null);
  if (!employee) return <Card><p className="text-white/60">Busca un colaborador activo para agregar una compra.</p></Card>;

  return (
    <Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/45">Colaborador seleccionado</p>
          <h2 className="mt-1 text-2xl font-black text-white">{employee.personName}</h2>
          <p className="mt-1 text-sm text-white/60">{employee.cedulaMasked} · {employee.areaId} · {employee.jobTitle}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-white/10 p-3"><b>{employee.ticketsSold}</b><br /><span className="text-white/45">Vendidos</span></div>
            <div className="rounded-2xl bg-white/10 p-3"><b>{employee.ticketsClaimed}</b><br /><span className="text-white/45">Reclamados</span></div>
            <div className="rounded-2xl bg-white/10 p-3"><b>{employee.ticketsPending}</b><br /><span className="text-white/45">Pendientes</span></div>
          </div>
          <Button className="mt-5 w-full" onClick={() => setLastCode(randomCode())} icon={<TicketPlus size={17} />}>Agregar compra y generar código</Button>
          <p className="mt-3 text-xs text-white/55">En producción este botón llama la RPC `sell_ticket(p_cedula)`, que genera el código dentro de PostgreSQL.</p>
        </div>
        {lastCode && <TicketReceipt code={lastCode} employeeName={employee.personName} />}
      </div>
    </Card>
  );
}
