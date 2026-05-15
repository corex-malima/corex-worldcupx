import type { ReactNode } from 'react';
import type { AppUser } from '../../types/domain';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

export function AppShell({ user, children, onNavigate, onSignOut }: { user: AppUser | null; children: ReactNode; onNavigate: (to: string) => void; onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-pitch-950 text-white">
      <div className="stadium-lines pointer-events-none fixed inset-0 opacity-35" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopBar user={user} onNavigate={onNavigate} onSignOut={onSignOut} />
        <main className="mx-auto w-full max-w-[1720px] flex-1 px-3 pb-28 pt-5 sm:px-4 lg:px-6 xl:px-8 md:pb-12">{children}</main>
        <Footer />
        <BottomNav user={user} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
