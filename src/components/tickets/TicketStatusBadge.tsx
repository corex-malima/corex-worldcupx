import type { PredictionStatus, TicketStatus } from '../../types/domain';
import { Badge } from '../ui/Badge';

export function TicketStatusBadge({ status, predictionStatus }: { status: TicketStatus; predictionStatus: PredictionStatus }) {
  if (status === 'cancelled') return <Badge tone="red">Anulado</Badge>;
  if (predictionStatus === 'locked') return <Badge tone="red">Bloqueado</Badge>;
  if (predictionStatus === 'submitted') return <Badge tone="green">Enviado</Badge>;
  if (predictionStatus === 'in_progress') return <Badge tone="blue">En progreso</Badge>;
  return <Badge tone="gold">Pendiente</Badge>;
}
