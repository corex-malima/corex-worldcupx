import { useMemo } from 'react';
import { ArrowLeft, Check, Minus, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { TeamIdentity } from '../components/ui/TeamIdentity';
import { useTicketBreakdown, type ScoreDetailRow } from '../hooks/useTicketBreakdown';
import { useTicketPrediction } from '../hooks/useTicketPrediction';
import { useTournamentFixture } from '../hooks/useTournamentFixture';
import type { Match, Stage, Team } from '../types/tournament';

interface MatchRowView {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  // What the user actually predicted (oriented to match home/away)
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedHomeTeam: Team | null;
  predictedAwayTeam: Team | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualIsOfficial: boolean;
  pointsEarned: number;
  pointsExact: boolean;
  // Knockouts: did the predicted pair match this actual cruce (flexible)?
  cruceStatus: 'matched' | 'missed' | 'pending' | 'na';
  // Knockouts: if matched, what predicted match_no the user originally wrote (flexible)
  predictedFromMatchNo: number | null;
}

function findTeam(teams: Team[], id: string | null | undefined): Team | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? null;
}

function scoreCellClass(actual: number | null, predicted: number | null, official: boolean): string {
  if (!official) return 'text-corex-ink/45';
  if (actual === null || predicted === null) return 'text-corex-ink/45';
  if (actual === predicted) return 'text-cup-green';
  return 'text-corex-ink/85';
}

function ResultBadge({ official, points, exact, stage, cruceStatus }: { official: boolean; points: number; exact: boolean; stage: Stage; cruceStatus: MatchRowView['cruceStatus'] }) {
  if (!official) return <Badge tone="slate">Sin resultado</Badge>;
  if (stage !== 'GROUP' && cruceStatus === 'missed') {
    return <Badge tone="red"><X size={11} className="inline" /> Cruce fallido · 0 pts</Badge>;
  }
  if (exact) return <Badge tone="green"><Check size={11} className="inline" /> Exacto +{points}</Badge>;
  if (points > 0) return <Badge tone="gold">+{points} pts</Badge>;
  return <Badge tone="red"><X size={11} className="inline" /> 0 pts</Badge>;
}

// Sub-component: TicketHeader (ticket info + total points)
function TicketHeader({ alias, ownerName, areaName, total, onNavigate }: { alias: string; ownerName: string | null; areaName: string | null; total: { total_points: number; calculated_at: string | null } | null; onNavigate: (to: string) => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <button type="button" onClick={() => onNavigate('#/ranking')} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-cup-blue hover:underline">
          <ArrowLeft size={13} /> Volver al ranking
        </button>
        <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Detalle</p>
        <h1 className="text-3xl font-semibold text-corex-ink">{alias}</h1>
        <p className="mt-1 text-sm text-corex-ink/65">{ownerName ?? '—'} · {areaName ?? 'SIN ÁREA'}</p>
      </div>
      <Card className="!p-4 text-right">
        <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Puntos totales</p>
        <p className="mt-1 text-4xl font-black text-corex-ink">{total?.total_points ?? 0}</p>
        <p className="mt-1 text-xs text-corex-ink/55">{total?.calculated_at ? `Recalc: ${new Date(total.calculated_at).toLocaleString('es-EC')}` : 'Sin recálculo'}</p>
      </Card>
    </div>
  );
}

// Sub-component: ScoreSummary (breakdown by category)
function ScoreSummary({ total, categoryStats }: { total: { group_match_points: number; group_position_points: number; knockout_points: number; advancement_points: number; champion_bonus: number; runner_up_bonus: number; total_points: number } | null; categoryStats: { groupExact: number; groupResult: number; koExact: number; koResult: number } }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-corex-ink">Desglose de puntos</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Grupo · marcador</p>
          <p className="mt-1 text-2xl font-black text-corex-ink">{total?.group_match_points ?? 0}</p>
          <p className="text-xs text-corex-ink/45">{categoryStats.groupExact} exactos · {categoryStats.groupResult} aciertos de resultado</p>
        </div>
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Grupo · posiciones</p>
          <p className="mt-1 text-2xl font-black text-corex-ink">{total?.group_position_points ?? 0}</p>
          <p className="text-xs text-corex-ink/45">+1 por equipo en 1.º/2.º/3.º exacto</p>
        </div>
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Eliminatoria · marcador</p>
          <p className="mt-1 text-2xl font-black text-corex-ink">{total?.knockout_points ?? 0}</p>
          <p className="text-xs text-corex-ink/45">{categoryStats.koExact} exactos · {categoryStats.koResult} aciertos de resultado</p>
          <p className="mt-1 text-[10px] text-corex-ink/35">+3 exacto / +1 resultado · solo si el cruce acierta</p>
        </div>
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Avance por ronda</p>
          <p className="mt-1 text-2xl font-black text-corex-ink">{total?.advancement_points ?? 0}</p>
          <p className="text-xs text-corex-ink/45">R32=2 · R16=4 · QF=8 · SF=10</p>
        </div>
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Bono campeón</p>
          <p className="mt-1 text-2xl font-black text-corex-ink">{total?.champion_bonus ?? 0}</p>
          <p className="text-xs text-corex-ink/45">+20 si acertaste</p>
        </div>
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Bono 3.º puesto</p>
          <p className="mt-1 text-2xl font-black text-corex-ink">{total?.runner_up_bonus ?? 0}</p>
          <p className="text-xs text-corex-ink/45">+10 si acertaste</p>
        </div>
        <div className="rounded-2xl bg-pitch-800 p-3">
          <p className="text-xs font-bold text-corex-ink/45">Total</p>
          <p className="mt-1 text-2xl font-black text-cup-green">{total?.total_points ?? 0}</p>
          <p className="text-xs text-corex-ink/45">Suma de las categorías</p>
        </div>
      </div>
    </Card>
  );
}

// Sub-component: MatchRow (single match card)
function MatchRow({ row }: { row: MatchRowView }) {
  return (
    <div className="grid items-center gap-2 rounded-2xl border border-corex-ink/10 bg-pitch-800 p-3 sm:grid-cols-[60px_1fr_120px_1fr_140px]">
      <div className="text-xs font-bold text-corex-ink/45">
        <p>#{row.match.matchNo}</p>
        {row.match.groupCode && <p className="mt-1">Grupo {row.match.groupCode}</p>}
      </div>

      {/* Predicción */}
      <div className="min-w-0 rounded-xl bg-pitch-900 p-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-corex-ink/35">
          Tu predicción
          {row.predictedFromMatchNo !== null && row.predictedFromMatchNo !== row.match.matchNo && (
            <span className="ml-1 text-cup-blue normal-case">· cruce flexible desde P{row.predictedFromMatchNo}</span>
          )}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
          <TeamIdentity team={row.predictedHomeTeam ?? undefined} label="—" size="sm" />
          <span className="font-black text-corex-ink/85">
            {row.predictedHomeScore ?? <Minus size={12} className="inline opacity-50" />} - {row.predictedAwayScore ?? <Minus size={12} className="inline opacity-50" />}
          </span>
          <TeamIdentity team={row.predictedAwayTeam ?? undefined} label="—" size="sm" align="right" />
        </div>
      </div>

      {/* Resultado real */}
      <div className="min-w-0 rounded-xl bg-pitch-900 p-2 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-corex-ink/35">Resultado real</p>
        <p className={`mt-1 text-lg font-black ${scoreCellClass(row.actualHomeScore, row.predictedHomeScore, row.actualIsOfficial)}`}>
          {row.actualIsOfficial ? `${row.actualHomeScore} - ${row.actualAwayScore}` : 'Pendiente'}
        </p>
      </div>

      {/* Equipos reales */}
      <div className="min-w-0 rounded-xl bg-pitch-900 p-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-corex-ink/35">
          Equipos oficiales
          {row.match.stage !== 'GROUP' && row.actualIsOfficial && (
            row.cruceStatus === 'matched'
              ? <span className="ml-1 text-cup-green normal-case">· cruce ✓</span>
              : row.cruceStatus === 'missed'
                ? <span className="ml-1 text-red-300 normal-case">· cruce ✗</span>
                : null
          )}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
          <TeamIdentity team={row.homeTeam ?? undefined} label={row.match.homeSlot ?? '—'} size="sm" />
          <TeamIdentity team={row.awayTeam ?? undefined} label={row.match.awaySlot ?? '—'} size="sm" align="right" />
        </div>
      </div>

      <div className="text-right">
        <ResultBadge official={row.actualIsOfficial} points={row.pointsEarned} exact={row.pointsExact} stage={row.match.stage} cruceStatus={row.cruceStatus} />
      </div>
    </div>
  );
}

// Sub-component: StageMatches (matches grouped by stage with header)
function StageMatches({ stage, rows, stageLabel }: { stage: Stage; rows: MatchRowView[]; stageLabel: Record<Stage, string> }) {
  if (rows.length === 0) return null;
  return (
    <Card key={stage}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-corex-ink">{stageLabel[stage]}</h3>
        <Badge tone="slate">{rows.filter((r) => r.actualIsOfficial).length}/{rows.length} oficiales</Badge>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <MatchRow key={row.match.id} row={row} />
        ))}
      </div>
    </Card>
  );
}

// helpers para leer score_details
function readNum(obj: Record<string, unknown> | undefined | null, path: string[]): number | null {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === 'number' ? cur : null;
}
function readBool(obj: Record<string, unknown> | undefined | null, key: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return obj[key] === true;
}
function readStr(obj: Record<string, unknown> | undefined | null, key: string): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const v = obj[key];
  return typeof v === 'string' ? v : null;
}

export function TicketBreakdownPage({ ticketId, onNavigate }: { ticketId: string; onNavigate: (to: string) => void }) {
  const { fixture, loading: fixtureLoading } = useTournamentFixture();
  const { data: prediction, loading: predictionLoading } = useTicketPrediction(ticketId);
  const { data: bundle, loading: bundleLoading } = useTicketBreakdown(ticketId);

  const loading = fixtureLoading || predictionLoading || bundleLoading;

  const matchesView = useMemo<MatchRowView[]>(() => {
    if (!fixture.matches.length) return [];
    const predictionByMatchId = new Map(prediction.groupScores.concat(prediction.knockoutScores).map((s) => [s.match_id, s]));
    const matchById = new Map(fixture.matches.map((m) => [m.id, m]));

    // Bucketize score_details:
    //  - group_match: item_ref = match_no (string). detail has actual/prediction scores.
    //  - knockout_match: detail.actual_match_no es la clave (cruce flexible).
    //    detail también trae pred_match_id y prediction_oriented (ya volteada al lado del actual).
    const groupDetails = new Map<number, ScoreDetailRow>();
    const knockoutDetails = new Map<number, ScoreDetailRow>();
    for (const d of bundle.details) {
      if (d.category === 'group_match') {
        const matchNo = readNum(d.detail, ['match_no']);
        if (matchNo !== null) groupDetails.set(matchNo, d);
      } else if (d.category === 'knockout_match') {
        const actualMatchNo = readNum(d.detail, ['actual_match_no']);
        if (actualMatchNo !== null) knockoutDetails.set(actualMatchNo, d);
      }
    }

    return fixture.matches.map((match) => {
      const home = findTeam(fixture.teams, match.homeTeamId);
      const away = findTeam(fixture.teams, match.awayTeamId);
      const isOfficial = match.status === 'official';
      const actualHomeScore = match.homeScore ?? null;
      const actualAwayScore = match.awayScore ?? null;
      const isGroup = match.stage === 'GROUP';

      let pointsEarned = 0;
      let pointsExact = false;
      let predictedHomeScore: number | null = null;
      let predictedAwayScore: number | null = null;
      let predictedHomeTeam: Team | null = null;
      let predictedAwayTeam: Team | null = null;
      let cruceStatus: MatchRowView['cruceStatus'] = isGroup ? 'na' : 'pending';
      let predictedFromMatchNo: number | null = null;

      if (isGroup) {
        // Fase de grupos: 1 predicción por partido (no hay flexibilidad).
        const pred = predictionByMatchId.get(match.id);
        predictedHomeScore = pred?.home_score ?? null;
        predictedAwayScore = pred?.away_score ?? null;
        predictedHomeTeam = pred ? findTeam(fixture.teams, pred.home_team_id) ?? home : null;
        predictedAwayTeam = pred ? findTeam(fixture.teams, pred.away_team_id) ?? away : null;
        const detail = groupDetails.get(match.matchNo);
        if (detail) {
          pointsEarned = detail.points;
          pointsExact = pointsEarned >= 3;
        }
      } else {
        // Eliminatorias: cruce FLEXIBLE.
        // 1) ¿Hay un detail que reclama haber matcheado este partido oficial?
        const koDetail = knockoutDetails.get(match.matchNo);
        if (koDetail && isOfficial) {
          // Cruce ✓: el SQL encontró una predicción del usuario con los mismos 2 equipos.
          cruceStatus = 'matched';
          pointsEarned = koDetail.points;
          pointsExact = pointsEarned >= 3;
          // prediction_oriented está volteado al lado del actual home/away
          predictedHomeScore = readNum(koDetail.detail, ['prediction_oriented', 'home']);
          predictedAwayScore = readNum(koDetail.detail, ['prediction_oriented', 'away']);
          predictedHomeTeam = home;
          predictedAwayTeam = away;
          // Si la predicción venía de OTRO match_no, lo anotamos para mostrar "cruce flexible"
          const predMatchId = readStr(koDetail.detail, 'pred_match_id');
          if (predMatchId) {
            const predMatch = matchById.get(predMatchId);
            if (predMatch && predMatch.matchNo !== match.matchNo) {
              predictedFromMatchNo = predMatch.matchNo;
            }
          }
          // Si la predicción fue volteada (home↔away), la dejamos anotada implícitamente
          // mostrando prediction_oriented (que ya está en orden del actual).
          if (readBool(koDetail.detail, 'flipped') && !predictedFromMatchNo) {
            // Aún así avisamos al usuario: orden invertido
            predictedFromMatchNo = match.matchNo; // misma fila pero con flag
          }
        } else if (isOfficial) {
          // No hay detail: el cruce no acertó.
          cruceStatus = 'missed';
          // Mostramos la predicción ORIGINAL del usuario para este match.id (para que vea
          // qué cruce escribió que no se dio).
          const pred = predictionByMatchId.get(match.id);
          predictedHomeScore = pred?.home_score ?? null;
          predictedAwayScore = pred?.away_score ?? null;
          predictedHomeTeam = pred ? findTeam(fixture.teams, pred.home_team_id) : null;
          predictedAwayTeam = pred ? findTeam(fixture.teams, pred.away_team_id) : null;
        } else {
          // Partido aún no oficial: mostramos predicción original
          const pred = predictionByMatchId.get(match.id);
          predictedHomeScore = pred?.home_score ?? null;
          predictedAwayScore = pred?.away_score ?? null;
          predictedHomeTeam = pred ? findTeam(fixture.teams, pred.home_team_id) : null;
          predictedAwayTeam = pred ? findTeam(fixture.teams, pred.away_team_id) : null;
        }
      }

      return {
        match,
        homeTeam: home,
        awayTeam: away,
        predictedHomeScore,
        predictedAwayScore,
        predictedHomeTeam,
        predictedAwayTeam,
        actualHomeScore,
        actualAwayScore,
        actualIsOfficial: isOfficial,
        pointsEarned,
        pointsExact,
        cruceStatus,
        predictedFromMatchNo
      };
    });
  }, [fixture.matches, fixture.teams, prediction.groupScores, prediction.knockoutScores, bundle.details]);

  // Counts por categoría derivados de score_details (mucho más fiables que los
  // campos agregados exact_count/result_count de ticket_scores, que mezclaban
  // grupos + eliminatorias y producían textos inconsistentes con los puntos).
  const categoryStats = useMemo(() => {
    let groupExact = 0, groupResult = 0;
    let koExact = 0, koResult = 0;
    for (const d of bundle.details) {
      if (d.category === 'group_match') {
        if (d.points === 3) groupExact += 1;
        else if (d.points === 1) groupResult += 1;
      } else if (d.category === 'knockout_match') {
        if (d.points === 3) koExact += 1;
        else if (d.points === 1) koResult += 1;
      }
    }
    return { groupExact, groupResult, koExact, koResult };
  }, [bundle.details]);

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
      <TicketHeader alias={bundle.alias} ownerName={bundle.ownerName} areaName={bundle.areaName} total={total} onNavigate={onNavigate} />

      <ScoreSummary total={total} categoryStats={categoryStats} />

      {stageOrder.map((stage) => {
        const rows = matchesByStage.get(stage) ?? [];
        return <StageMatches key={stage} stage={stage} rows={rows} stageLabel={stageLabel} />;
      })}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => onNavigate('#/ranking')} icon={<ArrowLeft size={15} />}>Volver al ranking</Button>
      </div>
    </div>
  );
}
