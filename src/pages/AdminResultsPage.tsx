import { RefreshCw } from 'lucide-react';
import { mockMatches } from '../data/mock/matches';
import { mockTeams } from '../data/mock/teams';
import { ActualResultForm } from '../components/admin/ActualResultForm';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function AdminResultsPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-cup-gold">Resultados reales</p><h1 className="text-3xl font-black text-white">Cargar marcadores oficiales</h1></div><Button icon={<RefreshCw size={17} />}>Recalcular ranking</Button></div>
        <Card><p className="text-sm text-white/65">En producción cada formulario llama `save_actual_result` y luego `recalculate_all_scores`. El ranking se actualiza desde vistas SQL.</p></Card>
        <div className="space-y-3">{mockMatches.map((match) => <ActualResultForm key={match.id} match={match} teams={mockTeams} />)}</div>
      </div>
    </div>
  );
}
