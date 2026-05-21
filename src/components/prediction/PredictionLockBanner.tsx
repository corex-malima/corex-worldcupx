import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function PredictionLockBanner({ locked, submitted }: { locked: boolean; submitted: boolean }) {
  return (
    <div className={`rounded-2xl border bg-pitch-900 p-4 ${locked ? 'border-cup-red/30' : submitted ? 'border-cup-green/30' : 'border-cup-blue/30'}`}>
      <div className="flex flex-wrap items-center gap-3">
        {locked ? <AlertTriangle className="text-cup-red" /> : <CheckCircle2 className={submitted ? 'text-cup-green' : 'text-cup-blue'} />}
        <div className="min-w-0 flex-1">
          <p className="font-black text-corex-ink">{locked ? 'Predicción bloqueada por deadline' : submitted ? 'Predicción enviada' : 'Borrador editable'}</p>
          <p className="text-sm text-corex-ink/60">{locked ? 'Solo lectura. Los cambios deben validarse también en backend cuando Supabase esté activo.' : 'Puedes ajustar marcadores antes del cierre y volver a enviar.'}</p>
          {submitted && (
            <p className="mt-1 text-xs text-corex-ink/65">
              Cualquier modificación queda en borrador local. Click <strong>Reenviar predicción</strong> en el resumen para confirmar cambios.
            </p>
          )}
        </div>
        <Badge tone={locked ? 'red' : submitted ? 'green' : 'gold'}>{locked ? 'Bloqueado' : submitted ? 'Enviado' : 'En progreso'}</Badge>
      </div>
    </div>
  );
}
