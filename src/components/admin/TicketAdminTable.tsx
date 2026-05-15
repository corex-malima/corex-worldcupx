import { useState } from 'react';
import { Ban } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { AdminTicketRow } from '../../hooks/useAdminTickets';

interface Props {
  rows: AdminTicketRow[];
  loading: boolean;
  error: string | null;
  onCancel: (ticketId: string, reason: string) => Promise<void>;
}

export function TicketAdminTable({ rows, loading, error, onCancel }: Props) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    const reason = window.prompt('Motivo de anulación');
    if (!reason || !reason.trim()) return;
    setCancellingId(id);
    try {
      await onCancel(id, reason.trim());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo anular el ticket.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-pitch-900">
      {error && (
        <p className="border-b border-white/10 bg-cup-red/15 p-3 text-sm font-bold text-red-100">{error}</p>
      )}
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-pitch-800 text-left text-white/50">
          <tr>
            <th className="p-4">Código</th>
            <th>Colaborador</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Puntos</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-white/55">Cargando tickets…</td>
            </tr>
          )}
          {!loading && rows.length === 0 && !error && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-white/55">Aún no hay tickets vendidos.</td>
            </tr>
          )}
          {!loading && rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10 text-white/80">
              <td className="p-4 font-black tracking-widest">{row.codeMasked}</td>
              <td>{row.personName}</td>
              <td>{row.areaName ?? row.areaId ?? '—'}</td>
              <td>
                <Badge tone={row.status === 'claimed' ? 'green' : row.status === 'cancelled' ? 'red' : 'gold'}>
                  {row.status}
                </Badge>
              </td>
              <td>{row.points}</td>
              <td>
                {row.status !== 'cancelled' && (
                  <Button
                    variant="danger"
                    icon={<Ban size={16} />}
                    disabled={cancellingId === row.id}
                    onClick={() => void handleCancel(row.id)}
                  >
                    {cancellingId === row.id ? 'Anulando…' : 'Anular'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
