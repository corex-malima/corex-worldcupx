import { BarChart3, ClipboardList, Home, TicketPlus } from 'lucide-react';
import { Button } from '../ui/Button';

export function AdminSidebar({ onNavigate }: { onNavigate: (to: string) => void }) {
  const items = [
    { label: 'Resumen', route: '#/admin', icon: Home },
    { label: 'Ventas', route: '#/admin/sales', icon: TicketPlus },
    { label: 'Tickets', route: '#/admin/tickets', icon: ClipboardList },
    { label: 'Resultados', route: '#/admin/results', icon: BarChart3 }
  ];
  return (
    <aside className="hidden w-64 shrink-0 rounded-3xl border border-white/10 bg-white/[0.06] p-3 md:block">
      <p className="px-3 py-2 text-xs font-black uppercase tracking-widest text-white/45">TTHH / Admin</p>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return <Button key={item.route} variant="ghost" className="w-full justify-start" onClick={() => onNavigate(item.route)} icon={<Icon size={18} />}>{item.label}</Button>;
        })}
      </div>
    </aside>
  );
}
