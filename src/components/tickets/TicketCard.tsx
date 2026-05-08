import { Edit3, Lock, Ticket as TicketIcon } from 'lucide-react';
import type { Ticket } from '../../types/domain';
import { formatPoints } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TicketStatusBadge } from './TicketStatusBadge';

export function TicketCard({ ticket, onOpen }: { ticket: Ticket; onOpen: (ticketId: string) => void }) {
  const locked = ticket.predictionStatus === 'locked' || ticket.status === 'cancelled';
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cup-gold/20 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10"><TicketIcon size={19} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/45">Código</p>
              <p className="text-2xl font-black tracking-widest text-white">{ticket.codeMasked}</p>
            </div>
          </div>
          <TicketStatusBadge status={ticket.status} predictionStatus={ticket.predictionStatus} />
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-white/45">Puntos</p>
          <p className="text-3xl font-black text-cup-gold">{formatPoints(ticket.points)}</p>
        </div>
      </div>
      <Button className="relative mt-5 w-full" variant={locked ? 'secondary' : 'primary'} onClick={() => onOpen(ticket.id)} icon={locked ? <Lock size={17} /> : <Edit3 size={17} />}>
        {locked ? 'Ver predicción' : ticket.predictionStatus === 'pending' ? 'Hacer predicción' : 'Editar predicción'}
      </Button>
    </Card>
  );
}
