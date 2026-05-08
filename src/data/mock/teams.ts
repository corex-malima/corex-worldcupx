import type { Team } from '../../types/tournament';

export const mockTeams: Team[] = [
  { id: 'arg', fifaCode: 'ARG', name: 'Argentina', groupCode: 'A', flagEmoji: '🇦🇷', seedOrder: 1 },
  { id: 'mex', fifaCode: 'MEX', name: 'México', groupCode: 'A', flagEmoji: '🇲🇽', seedOrder: 2 },
  { id: 'ecu', fifaCode: 'ECU', name: 'Ecuador', groupCode: 'A', flagEmoji: '🇪🇨', seedOrder: 3 },
  { id: 'jpn', fifaCode: 'JPN', name: 'Japón', groupCode: 'A', flagEmoji: '🇯🇵', seedOrder: 4 },
  { id: 'bra', fifaCode: 'BRA', name: 'Brasil', groupCode: 'B', flagEmoji: '🇧🇷', seedOrder: 1 },
  { id: 'ger', fifaCode: 'GER', name: 'Alemania', groupCode: 'B', flagEmoji: '🇩🇪', seedOrder: 2 },
  { id: 'gha', fifaCode: 'GHA', name: 'Ghana', groupCode: 'B', flagEmoji: '🇬🇭', seedOrder: 3 },
  { id: 'kor', fifaCode: 'KOR', name: 'Corea del Sur', groupCode: 'B', flagEmoji: '🇰🇷', seedOrder: 4 },
  { id: 'fra', fifaCode: 'FRA', name: 'Francia', groupCode: 'C', flagEmoji: '🇫🇷', seedOrder: 1 },
  { id: 'usa', fifaCode: 'USA', name: 'Estados Unidos', groupCode: 'C', flagEmoji: '🇺🇸', seedOrder: 2 },
  { id: 'mar', fifaCode: 'MAR', name: 'Marruecos', groupCode: 'C', flagEmoji: '🇲🇦', seedOrder: 3 },
  { id: 'aus', fifaCode: 'AUS', name: 'Australia', groupCode: 'C', flagEmoji: '🇦🇺', seedOrder: 4 }
];
