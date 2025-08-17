import type { LeagueGame } from '../data/source';
const mock: LeagueGame[] = [
  {
    id: 'nfl-mock-1',
    league: 'nfl',
    startTimeISO: new Date(Date.now() + 3600_000).toISOString(),
    homeTeam: '49ers',
    awayTeam: 'Seahawks',
    market: 'SPREAD',
    line: 'SF -3.5',
    oddsHome: -110,
    oddsAway: -110,
    confidence: 78,
  },
];
export default mock;
