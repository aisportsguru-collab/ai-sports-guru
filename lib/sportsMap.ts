export type SupportedSport =
  | "nfl"
  | "nba"
  | "mlb"
  | "nhl"
  | "ncaaf"
  | "ncaab"
  | "wnba";

export const ODDSAPI_SPORT_KEYS: Record<SupportedSport, string> = {
  nfl: "americanfootball_nfl",
  nba: "basketball_nba",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  wnba: "basketball_wnba",
};

export const DEFAULT_REGIONS = "us";
export const DEFAULT_MARKETS = "h2h,spreads,totals"; // moneyline, spread, total
export const DEFAULT_ODDS_FORMAT = "american";
export const DEFAULT_DATE_FORMAT = "iso";
