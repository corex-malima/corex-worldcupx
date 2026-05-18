import { RankingFilters } from '../components/ranking/RankingFilters';
import { RankingPodium } from '../components/ranking/RankingPodium';
import { RankingTable } from '../components/ranking/RankingTable';
import { LoadingState } from '../components/ui/LoadingState';
import { InfoButton } from '../components/ui/InfoButton';
import { useRanking } from '../hooks/useRanking';
import { help } from '../lib/help/helpContent';

export function RankingPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const ranking = useRanking();
  if (ranking.loading) return <LoadingState label="Cargando ranking" />;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Ranking en vivo</p>
        <h1 className="text-3xl font-semibold text-corex-ink">
          Tabla general por ticket
          <InfoButton title={help.ranking.title} className="ml-2 align-middle">{help.ranking.body}</InfoButton>
        </h1>
        <p className="mt-2 text-corex-ink/60">Click en "Ver" para analizar predicho vs real y el desglose de puntos de un ticket.</p>
      </div>
      <RankingPodium rows={ranking.rows} />
      <RankingFilters
        areas={ranking.areas}
        classifications={ranking.classifications}
        areaValue={ranking.areaFilter}
        classificationValue={ranking.classificationFilter}
        onAreaChange={ranking.setAreaFilter}
        onClassificationChange={ranking.setClassificationFilter}
      />
      <RankingTable rows={ranking.rows} onView={(row) => onNavigate(`#/tickets/${row.ticketId}/breakdown`)} />
    </div>
  );
}
