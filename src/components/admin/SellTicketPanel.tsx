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
  const [lastCodes, setLastCodes] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const { stats, loading: statsLoading } = useEmployeeTicketStats({
    cedula: employee?.cedula ?? null,
    personId: employee?.personId ?? null
  });

  const MAX_TICKETS = 5;
  const remaining = Math.max(0, MAX_TICKETS - stats.ticketsSold);
  const limitReached = remaining === 0;

  // Reset quantity when employee changes
  const prevEmployeeId = employee?.personId;
  const [prevId, setPrevId] = useState<string | null>(null);
  if (prevEmployeeId !== prevId) {
    setPrevId(prevEmployeeId ?? null);
    setQuantity(1);
  }

  async function sellMultipleTickets() {
    if (!employee) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProgressMessage(null);
    setLastCodes([]);

    const codes: string[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        setProgressMessage(`Vendiendo ${i + 1}/${quantity} tickets...`);
        const result = await sellTicketForCollaborator(employeeToProfile(employee));
        codes.push(result.code);
      }
      setLastCodes(codes);
      setSuccessMessage(`${quantity} compra${quantity === 1 ? '' : 's'} registrada${quantity === 1 ? '' : 's'} y codigos generados correctamente.`);
      setProgressMessage(null);
    } catch (err) {
      const successCount = codes.length;
      if (successCount > 0) {
        setError(`Se vendieron ${successCount}/${quantity} tickets. Último error: ${err instanceof Error ? err.message : 'desconocido'}`);
        setLastCodes(codes);
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo agregar la compra.');
      }
      setProgressMessage(null);
    } finally {
      setLoading(false);
    }
  }

  if (!employee) return <Card><p className="text-corex-ink/60">Busca un colaborador activo para agregar una compra.</p></Card>;

  return (
    <Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-corex-ink/45">Colaborador seleccionado</p>
          <h2 className="mt-1 text-2xl font-semibold text-corex-ink">{employee.personName}</h2>
          <div className="mt-3 grid gap-3 text-sm text-corex-ink/65 sm:grid-cols-2">
            <p><span className="text-corex-ink/40">Cedula:</span> {employee.cedulaMasked}</p>
            <p><span className="text-corex-ink/40">Codigo personal:</span> {employee.personId}</p>
            <p><span className="text-corex-ink/40">Area:</span> {employee.areaName ?? employee.costArea ?? employee.areaId}</p>
            <p><span className="text-corex-ink/40">Clasificacion:</span> {employee.jobClassificationCode ?? 'Pendiente'}</p>
            <p className="sm:col-span-2"><span className="text-corex-ink/40">Cargo:</span> {employee.jobTitle}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-pitch-800 p-3"><b>{statsLoading ? '…' : stats.ticketsSold}</b><br /><span className="text-corex-ink/45">Vendidos</span></div>
            <div className="rounded-2xl bg-pitch-800 p-3"><b>{statsLoading ? '…' : stats.ticketsClaimed}</b><br /><span className="text-corex-ink/45">Reclamados</span></div>
            <div className="rounded-2xl bg-pitch-800 p-3"><b>{statsLoading ? '…' : stats.ticketsPending}</b><br /><span className="text-corex-ink/45">Pendientes</span></div>
          </div>
          <div className="mt-3 text-xs text-corex-ink/60">
            Tickets activos: <strong className={limitReached ? 'text-cup-red' : 'text-corex-ink'}>{statsLoading ? '…' : stats.ticketsSold} / {MAX_TICKETS}</strong>
          </div>
          {limitReached && (
            <div className="mt-5 rounded-2xl border border-cup-red/40 bg-cup-red/10 p-3 text-sm font-bold text-cup-red">
              ⚠ Este colaborador ya tiene 5 tickets activos (límite máximo). Anula uno cancelado para liberar espacio.
            </div>
          )}
          {remaining > 0 && (
            <div className="mt-5 space-y-3">
              <label className="block text-sm text-corex-ink/70">
                Cantidad a vender: {remaining} disponible{remaining === 1 ? '' : 's'}
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                disabled={loading}
                className="w-full rounded-lg border border-corex-ink/20 bg-pitch-900 px-3 py-2 text-sm text-corex-ink disabled:opacity-50"
              >
                {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'ticket' : 'tickets'}</option>
                ))}
              </select>
            </div>
          )}
          <Button className="mt-5 w-full" disabled={loading || limitReached} onClick={() => void sellMultipleTickets()} icon={<TicketPlus size={17} />} title={limitReached ? 'Máximo 5 tickets activos por colaborador' : ''}>
            {loading ? progressMessage || 'Generando codigos' : 'Agregar compra y generar codigos'}
          </Button>
          <p className="mt-3 text-xs text-corex-ink/55">La venta se guarda en Supabase con un codigo unico vinculado a cedula y codigo personal.</p>
          {successMessage && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-cup-green/15 p-3 text-sm font-bold text-cup-green"><CheckCircle2 size={17} /> {successMessage}</p>}
          {error && <p className="mt-3 rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-cup-red">{error}</p>}
          {lastCodes.length > 0 && (
            <div className="mt-4 rounded-2xl bg-pitch-800 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-corex-ink/45">Codigos generados ({lastCodes.length}):</p>
              <div className="space-y-2">
                {lastCodes.map((code, idx) => (
                  <div key={idx} className="font-mono text-sm text-corex-ink">{code}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        {lastCodes.length === 1 && <TicketReceipt code={lastCodes[0]} employeeName={employee.personName} />}
      </div>
    </Card>
  );
}
