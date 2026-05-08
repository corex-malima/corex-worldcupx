import { useMemo, useState } from 'react';
import { CheckCircle2, Grid2X2, ListChecks, Network, Trophy } from 'lucide-react';
import { DEFAULT_DEADLINE_ISO } from '../lib/constants';
import { isPredictionLocked } from '../lib/tournament';
import { usePrediction } from '../hooks/usePrediction';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GroupPredictionBoard } from '../components/prediction/GroupPredictionBoard';
import { BestThirdsPanel } from '../components/prediction/BestThirdsPanel';
import { PredictionProgress } from '../components/prediction/PredictionProgress';
import { PredictionSummary } from '../components/prediction/PredictionSummary';
import { BracketBoard } from '../components/bracket/BracketBoard';
import type { BracketMatch } from '../types/tournament';

const tabs = [
  { key: 'groups', label: 'Grupos', icon: Grid2X2 },
  { key: 'qualified', label: 'Clasificados', icon: ListChecks },
  { key: 'bracket', label: 'Eliminatorias', icon: Network },
  { key: 'summary', label: 'Resumen', icon: Trophy }
] as const;

type Tab = typeof tabs[number]['key'];

export function TicketPredictionPage({ ticketId }: { ticketId: string }) {
  const [tab, setTab] = useState<Tab>('groups');
  const prediction = usePrediction(ticketId);
  const locked = isPredictionLocked(DEFAULT_DEADLINE_ISO);
  const bracketMatches: BracketMatch[] = useMemo(() => {
    return prediction.matches.filter((match) => match.stage !== 'GROUP');
  }, [prediction.matches]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-widest text-cup-gold">Ticket {ticketId}</p><h1 className="text-3xl font-black text-white">Predicción mundialista</h1></div>
        <Badge tone={locked ? 'red' : 'green'}>{locked ? 'Solo lectura' : 'Editable hasta deadline'}</Badge>
      </div>

      <PredictionProgress value={prediction.progress} />

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((item) => {
          const Icon = item.icon;
          return <Button key={item.key} variant={tab === item.key ? 'primary' : 'secondary'} onClick={() => setTab(item.key)} icon={<Icon size={17} />}>{item.label}</Button>;
        })}
      </div>

      {tab === 'groups' && (
        <GroupPredictionBoard
          teams={prediction.teams}
          matches={prediction.matches}
          predictions={prediction.predictions}
          standings={prediction.standings}
          disabled={locked}
          onChange={(matchId, home, away) => prediction.setScore(matchId, home, away)}
          onSave={(matchId) => void prediction.saveScore(matchId)}
        />
      )}

      {tab === 'qualified' && (
        <div className="space-y-4">
          <BestThirdsPanel rows={prediction.qualified.bestThirds} teams={prediction.teams} />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {prediction.qualified.direct.map((row) => {
              const team = prediction.teams.find((item) => item.id === row.teamId);
              return <div key={row.teamId} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 font-black text-white"><CheckCircle2 className="mb-2 text-cup-green" />{team?.flagEmoji} {team?.name}<p className="text-sm font-normal text-white/50">Grupo {row.groupCode} · Posición {row.position}</p></div>;
            })}
          </div>
        </div>
      )}

      {tab === 'bracket' && <BracketBoard teams={prediction.teams} matches={bracketMatches} />}
      {tab === 'summary' && <PredictionSummary standings={prediction.standings} teams={prediction.teams} />}
    </div>
  );
}
