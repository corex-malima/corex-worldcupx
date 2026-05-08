import type { RankingRow } from '../../types/domain';

export const mockRanking: RankingRow[] = [
  { rank: 1, ticketId: 't1', alias: 'Ticket A1••••', employeeName: 'Andrea Molina', areaId: 'TTHH', points: 42, exactCount: 9, resultCount: 15, bonusPoints: 8, status: 'submitted' },
  { rank: 2, ticketId: 't2', alias: 'Ticket F7••••', employeeName: 'David Rivera', areaId: 'CAMPO', points: 39, exactCount: 8, resultCount: 14, bonusPoints: 7, status: 'submitted' },
  { rank: 3, ticketId: 't3', alias: 'Ticket K9••••', employeeName: 'Paola León', areaId: 'POSCOSECHA', points: 35, exactCount: 7, resultCount: 13, bonusPoints: 6, status: 'submitted' },
  { rank: 4, ticketId: 't4', alias: 'Ticket M2••••', employeeName: 'Carlos Vega', areaId: 'CAMPO', points: 31, exactCount: 6, resultCount: 12, bonusPoints: 5, status: 'in_progress' }
];
