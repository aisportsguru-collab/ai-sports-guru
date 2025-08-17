import type { LeagueGame } from '../data/source';
const mock: LeagueGame[] = [
  {
    id: 'mlb-mock-1',
    league: 'mlb',
    startTimeISO: new Date(Date.now() + 5400_000).toISOString(),
    homeTeam: 'Dodgers',
    awayTeam: 'Giants',
    market: 'MONEYLINE',
    oddsHome: -135,
    oddsAway: +120,
    confidence: 66,
  },
];
export default mock;
