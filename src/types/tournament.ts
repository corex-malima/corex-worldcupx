export type Stage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD_PLACE' | 'FINAL';
export type MatchStatus = 'scheduled' | 'live' | 'official';

export interface Team {
  id: string;
  fifaCode: string;
  name: string;
  groupCode: string;
  flagEmoji: string;
  flagUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  seedOrder: number;
}

export interface Match {
  id: string;
  matchNo: number;
  stage: Stage;
  groupCode?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeSlot?: string | null;
  awaySlot?: string | null;
  matchDatetime?: string | null;
  venue?: string | null;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  penaltyWinnerTeamId?: string | null;
  winnerTeamId?: string | null;
}

export interface ScorePrediction {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinnerTeamId?: string | null;
}

export interface StandingRow {
  teamId: string;
  groupCode: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  position: number;
}

export interface BracketMatch {
  id: string;
  stage: Stage;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeSlot?: string | null;
  awaySlot?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  penaltyWinnerTeamId?: string | null;
  winnerTeamId?: string | null;
}
