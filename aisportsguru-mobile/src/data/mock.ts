import type { LeagueGame } from "./leagues";
import type { Prediction } from "./predictions";

export const MOCK_GAMES: Record<string, LeagueGame[]> = {
  nfl: [
    {
      id: "nfl-nyj-buf-2025-08-16",
      league: "nfl",
      kickoffUtc: "2025-08-16T17:00:00Z",
      kickoffLocal: "10:00 AM",
      homeTeam: "Bills",
      awayTeam: "Jets",
      bestMarketLabel: "Spread",
      bestMarketLine: "BUF -2.5",
      bestOddsLabel: "+102",
    },
    {
      id: "nfl-kc-lv-2025-08-16",
      league: "nfl",
      kickoffUtc: "2025-08-16T20:25:00Z",
      kickoffLocal: "1:25 PM",
      homeTeam: "Raiders",
      awayTeam: "Chiefs",
      bestMarketLabel: "Total",
      bestMarketLine: "O 47.5",
      bestOddsLabel: "-105",
    },
  ],
  nba: [
    {
      id: "nba-lal-bos-2025-08-16",
      league: "nba",
      kickoffUtc: "2025-08-16T02:00:00Z",
      kickoffLocal: "7:00 PM",
      homeTeam: "Celtics",
      awayTeam: "Lakers",
      bestMarketLabel: "Spread",
      bestMarketLine: "BOS -4.0",
      bestOddsLabel: "-110",
    },
  ],
};

export const MOCK_PREDS: Record<string, Prediction[]> = {
  nfl: [
    {
      id: "pick-nfl-1",
      gameId: "nfl-nyj-buf-2025-08-16",
      league: "nfl",
      market: "spread",
      selection: "BUF -2.5",
      edge: 3.1,
      confidence: 0.68,
    },
    {
      id: "pick-nfl-2",
      gameId: "nfl-kc-lv-2025-08-16",
      league: "nfl",
      market: "total",
      selection: "Over 47.5",
      edge: 2.2,
      confidence: 0.61,
    },
  ],
  nba: [
    {
      id: "pick-nba-1",
      gameId: "nba-lal-bos-2025-08-16",
      league: "nba",
      market: "spread",
      selection: "BOS -4",
      edge: 2.9,
      confidence: 0.64,
    },
  ],
};
