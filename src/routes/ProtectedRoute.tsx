import type { ReactNode } from 'react';
import type { AppUser } from '../types/domain';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function ProtectedRoute({ user, children, onLogin }: { user: AppUser | null; children: ReactNode; onLogin: () => void }) {
  if (user) return <>{children}</>;
  return <Card><h2 className="text-xl font-semibold text-white">Sesión requerida</h2><p className="mt-2 text-white/60">Debes iniciar sesión para continuar.</p><Button className="mt-4" onClick={onLogin}>Ir al login</Button></Card>;
}
