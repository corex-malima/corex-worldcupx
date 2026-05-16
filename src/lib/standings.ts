import type { Match, ScorePrediction, StandingRow, Team } from '../types/tournament';

export interface StandingsOptions {
  manualTieBreakers?: Record<string, string[]>;
  fairPlayPoints?: Record<string, number>;
}

function matchScore(prediction: ScorePrediction | undefined, match: Match): { home: number; away: number } | null {
  const home = prediction?.homeScore ?? match.homeScore;
  const away = prediction?.awayScore ?? match.awayScore;
  if (home === null || home === undefined || away === null || away === undefined) return null;
  return { home, away };
}

function emptyRow(team: Team, options: StandingsOptions): StandingRow {
  return {
    teamId: team.id,
    groupCode: team.groupCode,
    played: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    position: 0,
    fairPlayPoints: options.fairPlayPoints?.[team.id] ?? undefined,
    tieStatus: 'clear',
    tieBreakerReason: 'Puntos, diferencia de gol y goles a favor'
  };
}

function applyResult(home: StandingRow, away: StandingRow, homeScore: number, awayScore: number) {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;

  if (homeScore > awayScore) home.points += 3;
  else if (homeScore < awayScore) away.points += 3;
  else {
    home.points += 1;
    away.points += 1;
  }
}

function generalKey(row: StandingRow): string {
  return `${row.points}|${row.goalDifference}|${row.goalsFor}`;
}

function headToHeadRows(tiedRows: StandingRow[], groupMatches: Match[], predictionMap: Map<string, ScorePrediction>): Map<string, StandingRow> {
  const tiedIds = new Set(tiedRows.map((row) => row.teamId));
  const mini = new Map<string, StandingRow>();
  tiedRows.forEach((row) => mini.set(row.teamId, { ...row, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 }));

  groupMatches.forEach((match) => {
    if (!match.homeTeamId || !match.awayTeamId || !tiedIds.has(match.homeTeamId) || !tiedIds.has(match.awayTeamId)) return;
    const score = matchScore(predictionMap.get(match.id), match);
    if (!score) return;
    const home = mini.get(match.homeTeamId);
    const away = mini.get(match.awayTeamId);
    if (!home || !away) return;
    applyResult(home, away, score.home, score.away);
  });

  mini.forEach((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  });
  return mini;
}

function splitEqualBy<T>(rows: T[], key: (row: T) => string): T[][] {
  const groups: T[][] = [];
  rows.forEach((row) => {
    const last = groups[groups.length - 1];
    if (last && key(last[0]) === key(row)) last.push(row);
    else groups.push([row]);
  });
  return groups;
}

function compareSeedAndName(teamMap: Map<string, Team>, a: StandingRow, b: StandingRow): number {
  return (teamMap.get(a.teamId)?.seedOrder ?? 999) - (teamMap.get(b.teamId)?.seedOrder ?? 999) ||
    (teamMap.get(a.teamId)?.name ?? '').localeCompare(teamMap.get(b.teamId)?.name ?? '');
}

function resolveTiedBlock(block: StandingRow[], groupMatches: Match[], predictionMap: Map<string, ScorePrediction>, teamMap: Map<string, Team>, options: StandingsOptions): StandingRow[] {
  if (block.length <= 1) return block;
  const h2h = headToHeadRows(block, groupMatches, predictionMap);
  const sortedByH2h = block.toSorted((a, b) => {
    const hA = h2h.get(a.teamId);
    const hB = h2h.get(b.teamId);
    return (hB?.points ?? 0) - (hA?.points ?? 0) ||
      (hB?.goalDifference ?? 0) - (hA?.goalDifference ?? 0) ||
      (hB?.goalsFor ?? 0) - (hA?.goalsFor ?? 0);
  });

  const h2hGroups = splitEqualBy(sortedByH2h, (row) => {
    const h = h2h.get(row.teamId);
    return `${h?.points ?? 0}|${h?.goalDifference ?? 0}|${h?.goalsFor ?? 0}`;
  });

  if (h2hGroups.length > 1) {
    return h2hGroups.flatMap((group) => resolveFinalTie(group, teamMap, options, 'head_to_head'));
  }

  return resolveFinalTie(block, teamMap, options, 'clear');
}

function resolveFinalTie(block: StandingRow[], teamMap: Map<string, Team>, options: StandingsOptions, priorStatus: StandingRow['tieStatus']): StandingRow[] {
  if (block.length <= 1) return block.map((row) => ({
    ...row,
    tieStatus: priorStatus === 'head_to_head' || priorStatus === 'fair_play' ? priorStatus : 'clear',
    tieBreakerReason: priorStatus === 'head_to_head' ? 'Enfrentamiento directo' : priorStatus === 'fair_play' ? 'Fair play' : row.tieBreakerReason
  }));

  const allFairPlay = block.every((row) => options.fairPlayPoints?.[row.teamId] !== undefined);
  if (allFairPlay) {
    const byFairPlay = block.toSorted((a, b) => (options.fairPlayPoints?.[a.teamId] ?? 9999) - (options.fairPlayPoints?.[b.teamId] ?? 9999));
    const fairPlayGroups = splitEqualBy(byFairPlay, (row) => String(options.fairPlayPoints?.[row.teamId]));
    if (fairPlayGroups.length > 1) {
      return fairPlayGroups.flatMap((group) => resolveFinalTie(group, teamMap, options, 'fair_play'));
    }
  }

  const manual = options.manualTieBreakers?.[block[0].groupCode] ?? [];
  const manualCoversBlock = block.every((row) => manual.includes(row.teamId));
  if (manualCoversBlock) {
    return block
      .toSorted((a, b) => manual.indexOf(a.teamId) - manual.indexOf(b.teamId))
      .map((row, index) => ({
        ...row,
        manualRank: index + 1,
        tieStatus: 'manual',
        tieBreakerReason: 'Sorteo/criterio manual'
      }));
  }

  return block
    .toSorted((a, b) => compareSeedAndName(teamMap, a, b))
    .map((row) => ({
      ...row,
      tieStatus: 'needs_manual',
      tieBreakerReason: allFairPlay ? 'Requiere sorteo/manual' : 'Requiere fair play o sorteo/manual'
    }));
}

export function calculateGroupStandings(teams: Team[], matches: Match[], predictions: ScorePrediction[] = [], options: StandingsOptions = {}): StandingRow[] {
  const predictionMap = new Map(predictions.map((prediction) => [prediction.matchId, prediction]));
  const rows = new Map<string, StandingRow>();

  teams.forEach((team) => rows.set(team.id, emptyRow(team, options)));

  matches.filter((match) => match.stage === 'GROUP').forEach((match) => {
    if (!match.homeTeamId || !match.awayTeamId) return;
    const score = matchScore(predictionMap.get(match.id), match);
    if (!score) return;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) return;
    applyResult(home, away, score.home, score.away);
  });

  const grouped = Array.from(rows.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst
  }));

  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const byGroup = new Map<string, StandingRow[]>();
  grouped.forEach((row) => byGroup.set(row.groupCode, [...(byGroup.get(row.groupCode) ?? []), row]));

  const ranked: StandingRow[] = [];
  byGroup.forEach((groupRows, groupCode) => {
    const groupMatches = matches.filter((match) => match.groupCode === groupCode);
    const sortedByGeneral = groupRows.toSorted((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
    );
    const resolved = splitEqualBy(sortedByGeneral, generalKey)
      .flatMap((block) => resolveTiedBlock(block, groupMatches, predictionMap, teamMap, options));
    resolved.forEach((row, index) => ranked.push({ ...row, position: index + 1 }));
  });

  return ranked.sort((a, b) => a.groupCode.localeCompare(b.groupCode) || a.position - b.position);
}

export function getQualifiedTeams(standings: StandingRow[]): { direct: StandingRow[]; bestThirds: StandingRow[] } {
  const direct = standings.filter((row) => row.position <= 2);
  const bestThirds = standings
    .filter((row) => row.position === 3)
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      (a.fairPlayPoints ?? 9999) - (b.fairPlayPoints ?? 9999) ||
      a.groupCode.localeCompare(b.groupCode)
    )
    .slice(0, 8);
  return { direct, bestThirds };
}

export function isGroupStageComplete(matches: Match[], predictions: ScorePrediction[]): boolean {
  const predicted = new Map(predictions.map((prediction) => [prediction.matchId, prediction]));
  return matches
    .filter((match) => match.stage === 'GROUP')
    .every((match) => {
      const prediction = predicted.get(match.id);
      return prediction?.homeScore !== null && prediction?.homeScore !== undefined && prediction?.awayScore !== null && prediction?.awayScore !== undefined;
    });
}

export function getGroupsNeedingManualTieBreaker(standings: StandingRow[]): string[] {
  return Array.from(new Set(standings.filter((row) => row.tieStatus === 'needs_manual').map((row) => row.groupCode))).sort();
}
