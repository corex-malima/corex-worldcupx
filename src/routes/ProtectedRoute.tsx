import type { ReactNode } from 'react';
import type { AppUser } from '../types/domain';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function ProtectedRoute({ user, loading, children, onLogin }: { user: AppUser | null; loading?: boolean; children: ReactNode; onLogin: () => void }) {
  if (loading) {
    return <Card><p className="text-sm text-corex-ink/60">Cargando sesión…</p></Card>;
  }
  if (user) return <>{children}</>;
  return <Card><h2 className="text-xl font-semibold text-corex-ink">Sesión requerida</h2><p className="mt-2 text-corex-ink/60">Debes iniciar sesión para continuar.</p><Button className="mt-4" onClick={onLogin}>Ir al login</Button></Card>;
}
