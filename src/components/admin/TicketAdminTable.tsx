import { Ban } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const rows = [
  { code: 'A1••••', name: 'David Rivera', area: 'CAMPO', status: 'claimed', points: 18 },
  { code: 'F7••••', name: 'David Rivera', area: 'CAMPO', status: 'sold', points: 0 },
  { code: 'K9••••', name: 'Paola León', area: 'POSCOSECHA', status: 'cancelled', points: 0 }
];

export function TicketAdminTable() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-white/10 text-left text-white/50"><tr><th className="p-4">Código</th><th>Colaborador</th><th>Área</th><th>Estado</th><th>Puntos</th><th></th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-white/10 text-white/80">
              <td className="p-4 font-black tracking-widest">{row.code}</td><td>{row.name}</td><td>{row.area}</td><td><Badge tone={row.status === 'claimed' ? 'green' : row.status === 'cancelled' ? 'red' : 'gold'}>{row.status}</Badge></td><td>{row.points}</td>
              <td><Button variant="danger" icon={<Ban size={16} />}>Anular</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
