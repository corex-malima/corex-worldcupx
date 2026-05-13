import { useState } from 'react';
import { TicketPlus } from 'lucide-react';
import type { EmployeeSearchResult } from '../../types/domain';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TicketReceipt } from '../tickets/TicketReceipt';
import { supabase } from '../../lib/supabase';
import { USE_MOCKS } from '../../lib/constants';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function SellTicketPanel({ employee }: { employee: EmployeeSearchResult | null }) {
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sellTicket() {
    if (!employee?.cedula) return;
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCKS || !supabase) {
        setLastCode(randomCode());
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('sell_ticket', {
        p_cedula: employee.cedula,
        p_purchase_amount: null
      });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { ok?: boolean; code?: string } | null;
      if (!result?.ok || !result.code) throw new Error('No se pudo generar el ticket.');
      setLastCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la compra.');
    } finally {
      setLoading(false);
    }
  }

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
          <Button className="mt-5 w-full" disabled={loading} onClick={() => void sellTicket()} icon={<TicketPlus size={17} />}>{loading ? 'Generando código' : 'Agregar compra y generar código'}</Button>
          <p className="mt-3 text-xs text-white/55">En producción este botón llama la RPC `sell_ticket(p_cedula)`, que genera el código dentro de PostgreSQL.</p>
          {error && <p className="mt-3 rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">{error}</p>}
        </div>
        {lastCode && <TicketReceipt code={lastCode} employeeName={employee.personName} />}
      </div>
    </Card>
  );
}
