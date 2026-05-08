import type { Match, ScorePrediction, StandingRow, Team } from '../types/tournament';

function matchScore(prediction: ScorePrediction | undefined, match: Match): { home: number; away: number } | null {
  const home = prediction?.homeScore ?? match.homeScore;
  const away = prediction?.awayScore ?? match.awayScore;
  if (home === null || home === undefined || away === null || away === undefined) return null;
  return { home, away };
}

export function calculateGroupStandings(teams: Team[], matches: Match[], predictions: ScorePrediction[] = []): StandingRow[] {
  const predictionMap = new Map(predictions.map((prediction) => [prediction.matchId, prediction]));
  const rows = new Map<string, StandingRow>();

  teams.forEach((team) => {
    rows.set(team.id, {
      teamId: team.id,
      groupCode: team.groupCode,
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      position: 0
    });
  });

  matches.filter((match) => match.stage === 'GROUP').forEach((match) => {
    if (!match.homeTeamId || !match.awayTeamId) return;
    const score = matchScore(predictionMap.get(match.id), match);
    if (!score) return;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += score.home;
    home.goalsAgainst += score.away;
    away.goalsFor += score.away;
    away.goalsAgainst += score.home;

    if (score.home > score.away) home.points += 3;
    else if (score.home < score.away) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  });

  const grouped = Array.from(rows.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst
  }));

  const byGroup = new Map<string, StandingRow[]>();
  grouped.forEach((row) => byGroup.set(row.groupCode, [...(byGroup.get(row.groupCode) ?? []), row]));

  const ranked: StandingRow[] = [];
  byGroup.forEach((groupRows) => {
    groupRows
      .sort((a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        teams.find((team) => team.id === a.teamId)!.seedOrder - teams.find((team) => team.id === b.teamId)!.seedOrder
      )
      .forEach((row, index) => ranked.push({ ...row, position: index + 1 }));
  });

  return ranked.sort((a, b) => a.groupCode.localeCompare(b.groupCode) || a.position - b.position);
}

export function getQualifiedTeams(standings: StandingRow[]): { direct: StandingRow[]; bestThirds: StandingRow[] } {
  const direct = standings.filter((row) => row.position <= 2);
  const bestThirds = standings
    .filter((row) => row.position === 3)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .slice(0, 8);
  return { direct, bestThirds };
}

export function buildDemoBracket(qualifiedTeamIds: string[]): Array<{ slot: string; homeTeamId?: string; awayTeamId?: string }> {
  const slots = ['R32-1', 'R32-2', 'R32-3', 'R32-4', 'R32-5', 'R32-6', 'R32-7', 'R32-8'];
  return slots.map((slot, index) => ({
    slot,
    homeTeamId: qualifiedTeamIds[index * 2],
    awayTeamId: qualifiedTeamIds[index * 2 + 1]
  }));
}

export function isPredictionLocked(deadlineIso: string): boolean {
  return Date.now() >= new Date(deadlineIso).getTime();
}
