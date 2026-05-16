import type { PersonProfile } from './personProfile';

type UserRole = 'collaborator' | 'admin_tthh' | 'super_admin';
export type TicketStatus = 'sold' | 'claimed' | 'cancelled';
export type PredictionStatus = 'pending' | 'in_progress' | 'submitted' | 'locked';

export interface AppUser {
  id: string;
  cedula: string;
  name: string;
  areaId: string;
  role: UserRole;
}

export interface Ticket {
  id: string;
  codeMasked: string;
  code?: string;
  status: TicketStatus;
  predictionStatus: PredictionStatus;
  points: number;
  ownerName: string;
  areaId: string;
  claimedAt?: string | null;
}

export interface RankingRow {
  rank: number;
  ticketId: string;
  alias: string;
  employeeName: string;
  areaId: string;
  areaName?: string | null;
  jobClassificationCode?: string | null;
  points: number;
  exactCount: number;
  resultCount: number;
  bonusPoints: number;
  status: PredictionStatus;
}

export interface EmployeeSearchResult {
  cedulaMasked: string;
  cedula?: string;
  personId: string;
  personName: string;
  areaId: string;
  areaName?: string | null;
  costArea: string;
  jobTitle: string;
  jobClassificationCode?: string | null;
  isActive: boolean;
  ticketsSold: number;
  ticketsClaimed: number;
  ticketsPending: number;
  sourceProfile?: PersonProfile;
}
