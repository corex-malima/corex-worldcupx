import { PredictionWizard } from '../components/prediction/PredictionWizard';

export function TicketPredictionPage({ ticketId, adminMode = false }: { ticketId: string; adminMode?: boolean }) {
  return <PredictionWizard ticketId={ticketId} adminMode={adminMode} />;
}
