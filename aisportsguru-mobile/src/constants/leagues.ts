export type LeagueId =
  | 'nfl'
  | 'nba'
  | 'mlb'
  | 'nhl'
  | 'ncaa_football'
  | 'ncaa_basketball';

export type LeagueMeta = {
  id: LeagueId;
  label: string;   // Human-friendly chip text
  short?: string;  // Optional shorthand (NCAAF/NCAAB)
};

export const LEAGUES: LeagueMeta[] = [
  { id: 'nfl',             label: 'NFL' },
  { id: 'nba',             label: 'NBA' },
  { id: 'mlb',             label: 'MLB' },
  { id: 'nhl',             label: 'NHL' },
  { id: 'ncaa_football',   label: 'NCAA Football',   short: 'NCAAF' },
  { id: 'ncaa_basketball', label: 'NCAA Basketball', short: 'NCAAB' },
];

// Helper when you only have an id and want a nice label
export const getLeagueLabel = (id: string) =>
  LEAGUES.find(l => l.id === id)?.label ?? id.replace(/_/g, ' ').toUpperCase();
