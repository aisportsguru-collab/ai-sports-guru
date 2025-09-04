// backend/model/predict.ts
import type { OddsRow } from "./types";

function americanToProb(odds: number | null | undefined): number | null {
  if (odds == null) return null;
  if (odds < 0) return (-odds) / ((-odds) + 100);
  return 100 / (odds + 100);
}

const clampConf = (x: number | null | undefined): number | null => {
  if (x == null || !Number.isFinite(x)) return null;
  const n = Math.round(x);
  return Math.max(55, Math.min(100, n));
};

export function pickFromOdds(row: OddsRow) {
  // Moneyline
  let pick_ml: string | null = null;
  let conf_ml: number | null = null;
  const pH = americanToProb(row.ml_home);
  const pA = americanToProb(row.ml_away);
  if (pH != null && pA != null) {
    pick_ml = pH >= pA ? "HOME" : "AWAY";
    conf_ml = Math.round(Math.max(pH, pA) * 100);
  }

  // Spread
  let pick_spread: string | null = null;
  let conf_spread: number | null = null;
  if (row.spread_line != null) {
    if (row.spread_line < 0) pick_spread = `HOME ${row.spread_line}`;
    else if (row.spread_line > 0) pick_spread = `AWAY ${-row.spread_line}`;
    else pick_spread = "PICK";
    const juice = Math.max(
      Math.abs(row.spread_home_price ?? 0),
      Math.abs(row.spread_away_price ?? 0)
    );
    conf_spread = Math.min(
      75,
      50 + Math.min(10, Math.round(Math.abs(row.spread_line) * 5)) + (juice >= 300 ? 10 : 0)
    );
  }

  // Total
  let pick_total: string | null = null;
  let conf_total: number | null = null;
  if (row.total_points != null) {
    if (row.over_price != null && row.under_price != null) {
      const overPick = row.over_price <= row.under_price;
      pick_total = (overPick ? "OVER " : "UNDER ") + row.total_points;
      const po = americanToProb(row.over_price);
      const pu = americanToProb(row.under_price);
      const pc = Math.max(po ?? 0, pu ?? 0);
      conf_total = Math.max(55, Math.round((pc || 0.55) * 100));
    } else {
      pick_total = "OVER " + row.total_points;
      conf_total = 58;
    }
  }

  // Clamp to 55–100
  conf_ml     = clampConf(conf_ml);
  conf_spread = clampConf(conf_spread);
  conf_total  = clampConf(conf_total);

  // Fallback
  if (!pick_ml && !pick_spread && !pick_total) {
    return {
      pick_ml: null, conf_ml: null,
      pick_spread: null, conf_spread: null,
      pick_total: null, conf_total: null,
    };
  }

  // Include features snapshot (helpful for /api/games debug)
  const features: Record<string, number | null> = {
    moneyline_home: row.ml_home ?? null,
    moneyline_away: row.ml_away ?? null,
    spread_line: row.spread_line ?? null,
    total_points: row.total_points ?? null,
    over_odds: row.over_price ?? null,
    under_odds: row.under_price ?? null,
  };

  return { pick_ml, conf_ml, pick_spread, conf_spread, pick_total, conf_total, features };
}
