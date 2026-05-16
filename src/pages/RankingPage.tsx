import { RankingFilters } from '../components/ranking/RankingFilters';
import { RankingPodium } from '../components/ranking/RankingPodium';
import { RankingTable } from '../components/ranking/RankingTable';
import { LoadingState } from '../components/ui/LoadingState';
import { useRanking } from '../hooks/useRanking';

export function RankingPage() {
  const ranking = useRanking();
  if (ranking.loading) return <LoadingState label="Cargando ranking" />;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Ranking en vivo</p>
        <h1 className="text-3xl font-black text-white">Tabla general por ticket</h1>
        <p className="mt-2 text-white/60">El ranking oculta cédulas completas y códigos completos de tickets ajenos.</p>
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
      <RankingTable rows={ranking.rows} />
    </div>
  );
}
