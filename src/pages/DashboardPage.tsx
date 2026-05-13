import { Medal, Ticket as TicketIcon, Trophy } from 'lucide-react';
import type { AppUser } from '../types/domain';
import { useTickets } from '../hooks/useTickets';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { ClaimTicketForm } from '../components/tickets/ClaimTicketForm';
import { TicketCard } from '../components/tickets/TicketCard';

export function DashboardPage({ user, onNavigate }: { user: AppUser; onNavigate: (to: string) => void }) {
  const { tickets, loading, claimTicket } = useTickets();
  const claimed = tickets.filter((ticket) => ticket.status === 'claimed').length;
  const pending = tickets.filter((ticket) => ticket.status === 'sold').length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <Card className="overflow-hidden">
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Hola, {user.name}</p>
          <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Tus tickets para competir por el ranking</h1>
          <p className="mt-3 max-w-2xl text-white/65">Cada ticket es una jugada independiente. Activa el código que te entregó TTHH y completa marcadores, clasificados, cruces y campeón antes del deadline.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => onNavigate('#/ranking')} icon={<Medal size={18} />}>Ver ranking</Button>
            <Button variant="secondary" onClick={() => onNavigate('#/prediction/ticket-1')} icon={<Trophy size={18} />}>Continuar predicción</Button>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-black uppercase tracking-widest text-white/45">Resumen</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-pitch-800 p-4"><TicketIcon className="mx-auto text-cup-blue" /><p className="mt-2 text-3xl font-black">{tickets.length}</p><p className="text-xs text-white/45">Total</p></div>
            <div className="rounded-2xl bg-pitch-800 p-4"><Trophy className="mx-auto text-cup-green" /><p className="mt-2 text-3xl font-black">{claimed}</p><p className="text-xs text-white/45">Activos</p></div>
            <div className="col-span-2 rounded-2xl border border-cup-blue/20 bg-pitch-800 p-4 text-left"><b className="text-cup-blue">{pending}</b> tickets vendidos pendientes de activar.</div>
          </div>
        </Card>
      </section>

      <ClaimTicketForm onClaim={claimTicket} />

      {loading ? <LoadingState label="Cargando tickets" /> : tickets.length === 0 ? <EmptyState title="Sin tickets todavía" message="Cuando TTHH registre una compra, podrás activar el código aquí." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onOpen={(ticketId) => onNavigate(`#/prediction/${ticketId}`)} />)}
        </div>
      )}
    </div>
  );
}
