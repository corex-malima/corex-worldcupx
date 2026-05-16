import type { ReactNode } from 'react';
import type { AppUser } from '../types/domain';
import { Card } from '../components/ui/Card';

export function AdminRoute({ user, children }: { user: AppUser | null; children: ReactNode }) {
  if (user?.role === 'admin_tthh' || user?.role === 'super_admin') return <>{children}</>;
  return <Card><h2 className="text-xl font-semibold text-white">Acceso restringido</h2><p className="mt-2 text-white/60">Este panel requiere rol admin_tthh o super_admin.</p></Card>;
}
