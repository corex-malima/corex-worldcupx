import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function NotFoundPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  return <Card><h1 className="text-2xl font-semibold text-corex-ink">Página no encontrada</h1><p className="mt-2 text-corex-ink/60">La ruta no existe.</p><Button className="mt-4" onClick={() => onNavigate('#/dashboard')}>Volver al inicio</Button></Card>;
}
