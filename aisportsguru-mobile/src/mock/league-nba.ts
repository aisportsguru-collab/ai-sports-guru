import type { LeagueGame } from '../data/source';
const mock: LeagueGame[] = [
  {
    id: 'nba-mock-1',
    league: 'nba',
    startTimeISO: new Date(Date.now() + 7200_000).toISOString(),
    homeTeam: 'Celtics',
    awayTeam: 'Knicks',
    market: 'TOTAL',
    line: '221.5',
    confidence: 71,
  },
];
export default mock;
