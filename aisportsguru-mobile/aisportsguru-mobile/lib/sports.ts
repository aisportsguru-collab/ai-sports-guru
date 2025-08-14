export const SPORTS = [
  { key: 'nfl',   label: 'NFL' },
  { key: 'nba',   label: 'NBA' },
  { key: 'mlb',   label: 'MLB' },
  { key: 'nhl',   label: 'NHL' },
  { key: 'ncaaf', label: 'NCAAF' },
  { key: 'ncaab', label: 'NCAAB' },
  { key: 'wnba',  label: 'WNBA' },
] as const;

export type SportKey = typeof SPORTS[number]['key'];
