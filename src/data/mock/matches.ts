import type { Match } from '../../types/tournament';

export const mockMatches: Match[] = [
  { id: 'm1', matchNo: 1, stage: 'GROUP', groupCode: 'A', homeTeamId: 'arg', awayTeamId: 'mex', status: 'scheduled', matchDatetime: '2026-06-11T15:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm2', matchNo: 2, stage: 'GROUP', groupCode: 'A', homeTeamId: 'ecu', awayTeamId: 'jpn', status: 'scheduled', matchDatetime: '2026-06-12T15:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm3', matchNo: 3, stage: 'GROUP', groupCode: 'A', homeTeamId: 'arg', awayTeamId: 'ecu', status: 'scheduled', matchDatetime: '2026-06-16T15:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm4', matchNo: 4, stage: 'GROUP', groupCode: 'A', homeTeamId: 'mex', awayTeamId: 'jpn', status: 'scheduled', matchDatetime: '2026-06-17T15:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm5', matchNo: 5, stage: 'GROUP', groupCode: 'B', homeTeamId: 'bra', awayTeamId: 'ger', status: 'scheduled', matchDatetime: '2026-06-11T18:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm6', matchNo: 6, stage: 'GROUP', groupCode: 'B', homeTeamId: 'gha', awayTeamId: 'kor', status: 'scheduled', matchDatetime: '2026-06-12T18:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm7', matchNo: 7, stage: 'GROUP', groupCode: 'C', homeTeamId: 'fra', awayTeamId: 'usa', status: 'scheduled', matchDatetime: '2026-06-13T15:00:00-05:00', venue: 'Estadio Demo' },
  { id: 'm8', matchNo: 8, stage: 'GROUP', groupCode: 'C', homeTeamId: 'mar', awayTeamId: 'aus', status: 'scheduled', matchDatetime: '2026-06-13T18:00:00-05:00', venue: 'Estadio Demo' }
];
