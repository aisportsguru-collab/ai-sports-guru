import type { NormalizedGame } from "../odds";

export function featurizeGame(_league: string, g: NormalizedGame) {
  // Keep it simple: pass through the betting features
  return {
    moneyline_home: g.moneyline_home,
    moneyline_away: g.moneyline_away,
    line_home: g.line_home,
    line_away: g.line_away,
  };
}
