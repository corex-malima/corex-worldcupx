import { Home, Medal, Ticket, UserCog } from 'lucide-react';
import type { AppUser } from '../../types/domain';

export function BottomNav({ user, onNavigate }: { user: AppUser | null; onNavigate: (to: string) => void }) {
  const items = [
    { label: 'Inicio', icon: Home, route: '#/dashboard' },
    { label: 'Tickets', icon: Ticket, route: '#/dashboard' },
    { label: 'Ranking', icon: Medal, route: '#/ranking' },
    ...(user?.role !== 'collaborator' ? [{ label: 'Admin', icon: UserCog, route: '#/admin' }] : [])
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-corex-ink/10 bg-pitch-950 p-2 md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => onNavigate(item.route)} className="rounded-xl p-2 text-xs font-bold text-corex-ink/70 hover:bg-pitch-800 hover:text-corex-ink">
              <Icon className="mx-auto mb-1" size={18} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
