import type { Match, StandingRow } from '../types/tournament';
import type { FinalPredictionSummary, PredictedBracketMatch, RoundCode, ThirdPlaceSlot } from '../types/prediction';

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'] as const;

/**
 * Acepta dos formatos de slot:
 *   - Compacto Supabase: "1A", "2B", "3C"
 *   - Verbose mock:       "1º Grupo A", "2º Grupo B"
 */
function parseRankSlot(slot: string): { position: number; groupCode: string } | null {
  const compact = slot.match(/^([123])([A-L])$/);
  if (compact) return { position: Number(compact[1]), groupCode: compact[2] };
  const verbose = slot.match(/^([123]).*Grupo\s+([A-L])$/);
  if (verbose) return { position: Number(verbose[1]), groupCode: verbose[2] };
  return null;
}

/**
 * Acepta dos formatos de slot de mejores terceros:
 *   - Compacto: "3A/B/C/D/F"
 *   - Verbose:  "3º Grupo A/B/C/D/F"
 */
function parseThirdGroups(label: string): string[] {
  const verbose = label.match(/Grupo\s+(.+)$/);
  if (verbose) {
    return verbose[1].split('/').map((group) => group.trim()).filter((group) => /^[A-L]$/.test(group));
  }
  const compact = label.match(/^3([A-L/]+)$/);
  if (compact) {
    return compact[1].split('/').map((group) => group.trim()).filter((group) => /^[A-L]$/.test(group));
  }
  return [];
}

function rankSlotTeamId(slot: string | null | undefined, standings: StandingRow[], thirdSlots: ThirdPlaceSlot[]): string | null {
  if (!slot) return null;
  const rankingMatch = parseRankSlot(slot);
  if (rankingMatch) {
    return standings.find((row) => row.groupCode === rankingMatch.groupCode && row.position === rankingMatch.position)?.teamId ?? null;
  }
  // Slot de tercero (cualquiera de los dos formatos)
  if (slot.startsWith('3') && parseThirdGroups(slot).length > 0) {
    const assigned = thirdSlots.find((thirdSlot) => thirdSlot.label === slot);
    return assigned?.assignedTeamId ?? null;
  }
  return null;
}

function parseWinnerSlot(slot: string | null | undefined): { type: 'winner' | 'loser'; matchNo: number } | null {
  if (!slot) return null;
  const winner = slot.match(/^Ganador Partido (\d+)$/);
  if (winner) return { type: 'winner', matchNo: Number(winner[1]) };
  const loser = slot.match(/^Perdedor Partido (\d+)$/);
  if (loser) return { type: 'loser', matchNo: Number(loser[1]) };
  return null;
}

function resolveTeamFromPrior(slot: string | null | undefined, matches: PredictedBracketMatch[]): string | null {
  const parsed = parseWinnerSlot(slot);
  if (!parsed) return null;
  const source = matches.find((match) => match.matchNo === parsed.matchNo);
  if (!source) return null;
  if (parsed.type === 'winner') return source.advancingTeamId;
  if (!source.advancingTeamId) return null;
  if (source.homeTeamId === source.advancingTeamId) return source.awayTeamId;
  if (source.awayTeamId === source.advancingTeamId) return source.homeTeamId;
  return null;
}

function decideAdvancingTeam(match: PredictedBracketMatch): string | null {
  if (!match.homeTeamId || !match.awayTeamId) return null;
  if (match.homeScore === null || match.homeScore === undefined || match.awayScore === null || match.awayScore === undefined) return null;
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  return match.advancingTeamId;
}

export function createThirdPlaceSlots(knockoutMatches: Match[]): ThirdPlaceSlot[] {
  let order = 0;
  return knockoutMatches
    .filter((match) => match.stage === 'R32')
    .flatMap((match) => {
      const entries: ThirdPlaceSlot[] = [];
      (['home', 'away'] as const).forEach((side) => {
        const label = side === 'home' ? match.homeSlot : match.awaySlot;
        if (!label?.startsWith('3')) return;
        const groups = parseThirdGroups(label);
        if (groups.length === 0) return;
        entries.push({
          slotId: `${match.id}-${side}`,
          matchNo: match.matchNo,
          side,
          label,
          allowedGroupCodes: groups,
          assignedTeamId: null,
          order: order++
        });
      });
      return entries;
    });
}

export function buildInitialBracket(knockoutMatches: Match[], standings: StandingRow[], thirdSlots: ThirdPlaceSlot[]): PredictedBracketMatch[] {
  return knockoutMatches
    .filter((match) => match.stage !== 'GROUP')
    .sort((a, b) => a.matchNo - b.matchNo)
    .map((match) => ({
      id: match.id,
      matchNo: match.matchNo,
      roundCode: match.stage as RoundCode,
      matchOrder: match.matchNo,
      homeTeamId: match.stage === 'R32' ? rankSlotTeamId(match.homeSlot, standings, thirdSlots) : null,
      awayTeamId: match.stage === 'R32' ? rankSlotTeamId(match.awaySlot, standings, thirdSlots) : null,
      homeSlot: match.homeSlot ?? null,
      awaySlot: match.awaySlot ?? null,
      sourceSlotHome: match.homeSlot ?? null,
      sourceSlotAway: match.awaySlot ?? null,
      homeScore: null,
      awayScore: null,
      advancingTeamId: null,
      venue: match.venue,
      matchDatetime: match.matchDatetime
    }));
}

export function updateBracketScore(matches: PredictedBracketMatch[], matchId: string, homeScore: number | null, awayScore: number | null, advancingTeamId?: string | null): PredictedBracketMatch[] {
  const updated = matches.map((match) =>
    match.id === matchId
      ? { ...match, homeScore, awayScore, advancingTeamId: advancingTeamId ?? (homeScore !== awayScore ? null : match.advancingTeamId) }
      : match
  );
  return propagateBracket(updated);
}

export function propagateBracket(matches: PredictedBracketMatch[]): PredictedBracketMatch[] {
  let next = matches.map((match) => ({ ...match }));
  ROUND_ORDER.forEach((round) => {
    next = next.map((match) => {
      const homeFromPrior = resolveTeamFromPrior(match.sourceSlotHome, next);
      const awayFromPrior = resolveTeamFromPrior(match.sourceSlotAway, next);
      const nextHomeTeamId = homeFromPrior ?? match.homeTeamId;
      const nextAwayTeamId = awayFromPrior ?? match.awayTeamId;
      const teamsChanged = nextHomeTeamId !== match.homeTeamId || nextAwayTeamId !== match.awayTeamId;
      const patched = {
        ...match,
        homeTeamId: nextHomeTeamId,
        awayTeamId: nextAwayTeamId,
        homeScore: teamsChanged ? null : match.homeScore,
        awayScore: teamsChanged ? null : match.awayScore,
        advancingTeamId: teamsChanged ? null : match.advancingTeamId
      };
      if (patched.roundCode !== round) return patched;
      return { ...patched, advancingTeamId: decideAdvancingTeam(patched) };
    });
  });
  return next;
}

export function summarizeFinalPrediction(matches: PredictedBracketMatch[]): FinalPredictionSummary {
  const final = matches.find((match) => match.roundCode === 'FINAL');
  const third = matches.find((match) => match.roundCode === 'THIRD_PLACE');
  const championTeamId = final?.advancingTeamId ?? null;
  const runnerUpTeamId = championTeamId && final ? (final.homeTeamId === championTeamId ? final.awayTeamId : final.homeTeamId) : null;
  const thirdPlaceTeamId = third?.advancingTeamId ?? null;
  const fourthPlaceTeamId = thirdPlaceTeamId && third ? (third.homeTeamId === thirdPlaceTeamId ? third.awayTeamId : third.homeTeamId) : null;
  return { championTeamId, runnerUpTeamId, thirdPlaceTeamId, fourthPlaceTeamId };
}
