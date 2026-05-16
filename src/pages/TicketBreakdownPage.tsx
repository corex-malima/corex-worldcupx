import { useMemo } from 'react';
import { ArrowLeft, Check, Minus, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { TeamIdentity } from '../components/ui/TeamIdentity';
import { useTicketBreakdown } from '../hooks/useTicketBreakdown';
import { useTicketPrediction } from '../hooks/useTicketPrediction';
import { useTournamentFixture } from '../hooks/useTournamentFixture';
import type { Match, Stage, Team } from '../types/tournament';

interface MatchRowView {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedHomeTeam: Team | null;
  predictedAwayTeam: Team | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualIsOfficial: boolean;
  pointsEarned: number;
  pointsExact: boolean;
  pointsResult: boolean;
}

function findTeam(teams: Team[], id: string | null | undefined): Team | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? null;
}

function scoreCellClass(actual: number | null, predicted: number | null, official: boolean): string {
  if (!official) return 'text-white/45';
  if (actual === null || predicted === null) return 'text-white/45';
  if (actual === predicted) return 'text-cup-green';
  return 'text-white/85';
}

function ResultBadge({ official, points, exact }: { official: boolean; points: number; exact: boolean }) {
  if (!official) return <Badge tone="slate">Sin resultado</Badge>;
  if (exact) return <Badge tone="green"><Check size={11} className="inline" /> Exacto +{points}</Badge>;
  if (points > 0) return <Badge tone="gold">+{points} pts</Badge>;
  return <Badge tone="red"><X size={11} className="inline" /> 0 pts</Badge>;
}

export function TicketBreakdownPage({ ticketId, onNavigate }: { ticketId: string; onNavigate: (to: string) => void }) {
  const { fixture, loading: fixtureLoading } = useTournamentFixture();
  const { data: prediction, loading: predictionLoading } = useTicketPrediction(ticketId);
  const { data: bundle, loading: bundleLoading } = useTicketBreakdown(ticketId);

  const loading = fixtureLoading || predictionLoading || bundleLoading;

  const matchesView = useMemo<MatchRowView[]>(() => {
    if (!fixture.matches.length) return [];
    const predictionByMatch = new Map(prediction.groupScores.concat(prediction.knockoutScores).map((s) => [s.match_id, s]));

    return fixture.matches.map((match) => {
      const pred = predictionByMatch.get(match.id);
      const home = findTeam(fixture.teams, match.homeTeamId);
      const away = findTeam(fixture.teams, match.awayTeamId);
      const predictedHome = pred ? findTeam(fixture.teams, pred.home_team_id) ?? home : null;
      const predictedAway = pred ? findTeam(fixture.teams, pred.away_team_id) ?? away : null;
      const isOfficial = match.status === 'official';
      const actualHomeScore = match.homeScore ?? null;
      const actualAwayScore = match.awayScore ?? null;
      const predictedHomeScore = pred?.home_score ?? null;
      const predictedAwayScore = pred?.away_score ?? null;

      let pointsEarned = 0;
      let pointsExact = false;
      let pointsResult = false;
      if (isOfficial && actualHomeScore !== null && actualAwayScore !== null && predictedHomeScore !== null && predictedAwayScore !== null) {
        if (actualHomeScore === predictedHomeScore && actualAwayScore === predictedAwayScore) {
          pointsEarned = 3;
          pointsExact = true;
          pointsResult = true;
        } else {
          const actualDir = Math.sign(actualHomeScore - actualAwayScore);
          const predDir = Math.sign(predictedHomeScore - predictedAwayScore);
          if (actualDir === predDir) {
            pointsEarned = 1;
            pointsResult = true;
          }
        }
      }

      return {
        match,
        homeTeam: home,
        awayTeam: away,
        predictedHomeScore,
        predictedAwayScore,
        predictedHomeTeam: predictedHome,
        predictedAwayTeam: predictedAway,
        actualHomeScore,
        actualAwayScore,
        actualIsOfficial: isOfficial,
        pointsEarned,
        pointsExact,
        pointsResult
      };
    });
  }, [fixture.matches, fixture.teams, prediction.groupScores, prediction.knockoutScores]);

  const matchesByStage = useMemo(() => {
    const m = new Map<Stage, MatchRowView[]>();
    matchesView.forEach((row) => {
      const list = m.get(row.match.stage) ?? [];
      list.push(row);
      m.set(row.match.stage, list);
    });
    return m;
  }, [matchesView]);

  if (loading) return <LoadingState label="Cargando detalle del ticket" />;

  const total = bundle.total;
  const stageOrder: Stage[] = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];
  const stageLabel: Record<Stage, string> = {
    GROUP: 'Fase de grupos',
    R32: 'Dieciseisavos',
    R16: 'Octavos',
    QF: 'Cuartos',
    SF: 'Semifinales',
    THIRD_PLACE: 'Tercer puesto',
    FINAL: 'Final'
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <button onClick={() => onNavigate('#/ranking')} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-cup-blue hover:underline">
            <ArrowLeft size={13} /> Volver al ranking
          </button>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Detalle</p>
          <h1 className="text-3xl font-black text-white">{bundle.alias}</h1>
          <p className="mt-1 text-sm text-white/65">{bundle.ownerName ?? '—'} · {bundle.areaName ?? 'SIN ÁREA'}</p>
        </div>
        <Card className="!p-4 text-right">
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Puntos totales</p>
          <p className="mt-1 text-4xl font-black text-white">{total?.total_points ?? 0}</p>
          <p className="mt-1 text-xs text-white/55">{total?.calculated_at ? `Recalc: ${new Date(total.calculated_at).toLocaleString('es-EC')}` : 'Sin recálculo'}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-black text-white">Desglose de puntos</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Grupo · marcador</p>
            <p className="mt-1 text-2xl font-black text-white">{total?.group_match_points ?? 0}</p>
            <p className="text-xs text-white/45">{total?.exact_count ?? 0} exactos · {total?.result_count ?? 0} aciertos de resultado</p>
          </div>
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Grupo · posiciones</p>
            <p className="mt-1 text-2xl font-black text-white">{total?.group_position_points ?? 0}</p>
            <p className="text-xs text-white/45">+1 por equipo en 1.º/2.º/3.º exacto</p>
          </div>
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Eliminatoria · marcador</p>
            <p className="mt-1 text-2xl font-black text-white">{total?.knockout_points ?? 0}</p>
            <p className="text-xs text-white/45">+3 exacto / +1 resultado (sólo si el cruce es exacto)</p>
          </div>
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Avance por ronda</p>
            <p className="mt-1 text-2xl font-black text-white">{total?.advancement_points ?? 0}</p>
            <p className="text-xs text-white/45">R32=1 · R16=2 · QF=3 · SF=4</p>
          </div>
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Bono campeón</p>
            <p className="mt-1 text-2xl font-black text-white">{total?.champion_bonus ?? 0}</p>
            <p className="text-xs text-white/45">+10 si acertaste</p>
          </div>
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Bono 3.º puesto</p>
            <p className="mt-1 text-2xl font-black text-white">{total?.runner_up_bonus ?? 0}</p>
            <p className="text-xs text-white/45">+5 si acertaste</p>
          </div>
          <div className="rounded-2xl bg-pitch-800 p-3">
            <p className="text-xs font-bold text-white/45">Total</p>
            <p className="mt-1 text-2xl font-black text-cup-green">{total?.total_points ?? 0}</p>
            <p className="text-xs text-white/45">Suma de las categorías</p>
          </div>
        </div>
      </Card>

      {stageOrder.map((stage) => {
        const rows = matchesByStage.get(stage) ?? [];
        if (rows.length === 0) return null;
        return (
          <Card key={stage}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-white">{stageLabel[stage]}</h3>
              <Badge tone="slate">{rows.filter((r) => r.actualIsOfficial).length}/{rows.length} oficiales</Badge>
            </div>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.match.id} className="grid items-center gap-2 rounded-2xl border border-white/10 bg-pitch-800 p-3 sm:grid-cols-[60px_1fr_120px_1fr_120px]">
                  <div className="text-xs font-bold text-white/45">
                    <p>#{row.match.matchNo}</p>
                    {row.match.groupCode && <p className="mt-1">Grupo {row.match.groupCode}</p>}
                  </div>

                  {/* Predicción */}
                  <div className="min-w-0 rounded-xl bg-pitch-900 p-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Tu predicción</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                      <TeamIdentity team={row.predictedHomeTeam ?? row.homeTeam ?? undefined} label="—" size="sm" />
                      <span className="font-black text-white/85">
                        {row.predictedHomeScore ?? <Minus size={12} className="inline opacity-50" />} - {row.predictedAwayScore ?? <Minus size={12} className="inline opacity-50" />}
                      </span>
                      <TeamIdentity team={row.predictedAwayTeam ?? row.awayTeam ?? undefined} label="—" size="sm" align="right" />
                    </div>
                  </div>

                  {/* Resultado real */}
                  <div className="min-w-0 rounded-xl bg-pitch-900 p-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Resultado real</p>
                    <p className={`mt-1 text-lg font-black ${scoreCellClass(row.actualHomeScore, row.predictedHomeScore, row.actualIsOfficial)}`}>
                      {row.actualIsOfficial ? `${row.actualHomeScore} - ${row.actualAwayScore}` : 'Pendiente'}
                    </p>
                  </div>

                  {/* Equipos reales (para R32+ donde pueden diferir) */}
                  <div className="min-w-0 rounded-xl bg-pitch-900 p-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Equipos oficiales</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                      <TeamIdentity team={row.homeTeam ?? undefined} label={row.match.homeSlot ?? '—'} size="sm" />
                      <TeamIdentity team={row.awayTeam ?? undefined} label={row.match.awaySlot ?? '—'} size="sm" align="right" />
                    </div>
                  </div>

                  <div className="text-right">
                    <ResultBadge official={row.actualIsOfficial} points={row.pointsEarned} exact={row.pointsExact} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => onNavigate('#/ranking')} icon={<ArrowLeft size={15} />}>Volver al ranking</Button>
      </div>
    </div>
  );
}
