import { LogOut, Shield, Trophy } from 'lucide-react';
import type { AppUser } from '../../types/domain';
import { Button } from '../ui/Button';

export function TopBar({ user, onNavigate, onSignOut }: { user: AppUser | null; onNavigate: (to: string) => void; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-pitch-950/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1720px] items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6 xl:px-8">
        <button onClick={() => onNavigate('#/dashboard')} className="flex items-center gap-3 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cup-gold text-pitch-950 shadow-glow"><Trophy size={22} /></span>
          <span>
            <span className="block text-sm font-black uppercase tracking-wide text-white">Polla Mundialista</span>
            <span className="block text-xs text-white/55">Torneo interno</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          {user?.role !== 'collaborator' && (
            <Button variant="secondary" onClick={() => onNavigate('#/admin')} icon={<Shield size={17} />}>Admin</Button>
          )}
          {user && <span className="hidden text-right text-xs text-white/60 sm:block">{user.name}<br />{user.areaId}</span>}
          {user && <Button variant="ghost" onClick={onSignOut} icon={<LogOut size={17} />}>Salir</Button>}
        </div>
      </div>
    </header>
  );
}
