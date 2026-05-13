import type { ReactNode } from 'react';
import type { AppUser } from '../../types/domain';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppShell({ user, children, onNavigate, onSignOut }: { user: AppUser | null; children: ReactNode; onNavigate: (to: string) => void; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-stadium text-white">
      <div className="stadium-lines pointer-events-none fixed inset-0 opacity-70" />
      <div className="relative z-10">
        <TopBar user={user} onNavigate={onNavigate} onSignOut={onSignOut} />
        <main className="mx-auto w-full max-w-[1720px] px-3 pb-28 pt-5 sm:px-4 lg:px-6 xl:px-8 md:pb-12">{children}</main>
        <BottomNav user={user} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
