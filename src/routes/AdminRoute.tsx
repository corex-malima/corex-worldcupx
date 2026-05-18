import type { ReactNode } from 'react';
import type { AppUser } from '../types/domain';
import { Card } from '../components/ui/Card';

export function AdminRoute({ user, loading, children }: { user: AppUser | null; loading?: boolean; children: ReactNode }) {
  if (loading) {
    return <Card><p className="text-sm text-corex-ink/60">Cargando sesión…</p></Card>;
  }
  if (user?.role === 'admin_tthh' || user?.role === 'super_admin') return <>{children}</>;
  return <Card><h2 className="text-xl font-semibold text-corex-ink">Acceso restringido</h2><p className="mt-2 text-corex-ink/60">Este panel requiere rol admin_tthh o super_admin.</p></Card>;
}
