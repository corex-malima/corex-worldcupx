import { useState } from 'react';
import { CheckCircle2, TicketPlus } from 'lucide-react';
import type { EmployeeSearchResult } from '../../types/domain';
import type { PersonProfile } from '../../types/personProfile';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TicketReceipt } from '../tickets/TicketReceipt';
import { sellTicketForCollaborator } from '../../services/ticketSalesService';
import { useEmployeeTicketStats } from '../../hooks/useEmployeeTicketStats';

function employeeToProfile(employee: EmployeeSearchResult): PersonProfile {
  return employee.sourceProfile ?? {
    person_id: employee.personId,
    person_name: employee.personName,
    area_id: employee.areaId,
    area_name: employee.areaName ?? employee.costArea,
    national_id: employee.cedula ?? null,
    gender: null,
    job_title: employee.jobTitle,
    associated_worker_name: null,
    email: null,
    phone_number: null,
    job_classification_code: employee.jobClassificationCode ?? null
  };
}

export function SellTicketPanel({ employee }: { employee: EmployeeSearchResult | null }) {
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { stats, loading: statsLoading } = useEmployeeTicketStats({
    cedula: employee?.cedula ?? null,
    personId: employee?.personId ?? null
  });

  async function sellTicket() {
    if (!employee) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await sellTicketForCollaborator(employeeToProfile(employee));
      setLastCode(result.code);
      setSuccessMessage('Compra registrada y codigo generado correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la compra.');
    } finally {
      setLoading(false);
    }
  }

  if (!employee) return <Card><p className="text-white/60">Busca un colaborador activo para agregar una compra.</p></Card>;

  return (
    <Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/45">Colaborador seleccionado</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{employee.personName}</h2>
          <div className="mt-3 grid gap-3 text-sm text-white/65 sm:grid-cols-2">
            <p><span className="text-white/40">Cedula:</span> {employee.cedulaMasked}</p>
            <p><span className="text-white/40">Codigo personal:</span> {employee.personId}</p>
            <p><span className="text-white/40">Area:</span> {employee.areaName ?? employee.costArea ?? employee.areaId}</p>
            <p><span className="text-white/40">Clasificacion:</span> {employee.jobClassificationCode ?? 'Pendiente'}</p>
            <p className="sm:col-span-2"><span className="text-white/40">Cargo:</span> {employee.jobTitle}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-pitch-800 p-3"><b>{statsLoading ? '…' : stats.ticketsSold}</b><br /><span className="text-white/45">Vendidos</span></div>
            <div className="rounded-2xl bg-pitch-800 p-3"><b>{statsLoading ? '…' : stats.ticketsClaimed}</b><br /><span className="text-white/45">Reclamados</span></div>
            <div className="rounded-2xl bg-pitch-800 p-3"><b>{statsLoading ? '…' : stats.ticketsPending}</b><br /><span className="text-white/45">Pendientes</span></div>
          </div>
          <Button className="mt-5 w-full" disabled={loading} onClick={() => void sellTicket()} icon={<TicketPlus size={17} />}>
            {loading ? 'Generando codigo' : 'Agregar compra y generar codigo'}
          </Button>
          <p className="mt-3 text-xs text-white/55">La venta se guarda en Supabase con un codigo unico vinculado a cedula y codigo personal.</p>
          {successMessage && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-cup-green/15 p-3 text-sm font-bold text-green-100"><CheckCircle2 size={17} /> {successMessage}</p>}
          {error && <p className="mt-3 rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">{error}</p>}
        </div>
        {lastCode && <TicketReceipt code={lastCode} employeeName={employee.personName} />}
      </div>
    </Card>
  );
}
