import type { Stage } from './tournament';

export type PredictionDraftStatus = 'draft' | 'ready_for_knockout' | 'submitted' | 'locked';
export type RoundCode = Exclude<Stage, 'GROUP'>;

export interface MatchScoreDraft {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ThirdPlaceSlot {
  slotId: string;
  matchNo: number;
  side: 'home' | 'away';
  label: string;
  allowedGroupCodes?: string[];
  assignedTeamId: string | null;
  order: number;
}

export interface PredictedBracketMatch {
  id: string;
  matchNo: number;
  roundCode: RoundCode;
  matchOrder: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSlot: string | null;
  awaySlot: string | null;
  homeScore: number | null;
  awayScore: number | null;
  advancingTeamId: string | null;
  sourceSlotHome: string | null;
  sourceSlotAway: string | null;
  venue?: string | null;
  matchDatetime?: string | null;
}

export interface PredictionDraft {
  ticketId: string;
  groupScores: Record<string, MatchScoreDraft>;
  manualTieBreakers: Record<string, string[]>;
  thirdPlaceAssignments: ThirdPlaceSlot[];
  bracketMatches: PredictedBracketMatch[];
  status: PredictionDraftStatus;
  updatedAt: string;
  submittedAt?: string | null;
}

export interface FinalPredictionSummary {
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdPlaceTeamId: string | null;
  fourthPlaceTeamId: string | null;
}
