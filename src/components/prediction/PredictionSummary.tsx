import { Trophy } from 'lucide-react';
import type { StandingRow, Team } from '../../types/tournament';
import { Card } from '../ui/Card';

export function PredictionSummary({ standings, teams }: { standings: StandingRow[]; teams: Team[] }) {
  const championCandidate = standings[0] ? teams.find((team) => team.id === standings[0].teamId) : null;
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-cup-blue/25 bg-pitch-800 text-cup-blue"><Trophy /></span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/45">Resumen preliminar</p>
          <h3 className="text-2xl font-black text-white">Campeón simulado: {championCandidate ? `${championCandidate.flagEmoji} ${championCandidate.name}` : 'pendiente'}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-white/65">La versión base calcula grupos y clasificados localmente. La generación FIFA completa de llaves debe conectarse con la RPC `build_predicted_bracket` y el fixture oficial.</p>
    </Card>
  );
}
