export type OddsRow = {
  game_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_time: string;

  ml_home: number | null;
  ml_away: number | null;

  spread_line: number | null;
  spread_home_price: number | null;
  spread_away_price: number | null;

  total_points: number | null;
  over_price: number | null;
  under_price: number | null;
};
