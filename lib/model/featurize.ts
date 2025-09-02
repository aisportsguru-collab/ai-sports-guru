import type { NormalGame } from "../odds";

export type FeatureRow = {
  league: string;
  kickoffISO: string;
  home: string;
  away: string;
  // market features
  ml_home: number | null;
  ml_away: number | null;
  spread_line: number | null;
  spread_home_price: number | null;
  spread_away_price: number | null;
  total_points: number | null;
  over_price: number | null;
  under_price: number | null;
};

export function featurize(g: NormalGame): FeatureRow {
  const m = g.markets || {};
  return {
    league: g.league,
    kickoffISO: g.kickoffISO,
    home: g.homeTeam,
    away: g.awayTeam,
    ml_home: m.ml?.home ?? null,
    ml_away: m.ml?.away ?? null,
    spread_line: typeof m.spread === "number" ? m.spread : null,
    spread_home_price: m.spread_price_home ?? null,
    spread_away_price: m.spread_price_away ?? null,
    total_points: typeof m.total === "number" ? m.total : null,
    over_price: m.over_price ?? null,
    under_price: m.under_price ?? null,
  };
}
