function impliedFromMoneyline(ml?: number | null): number | null {
  if (ml == null || Number.isNaN(ml)) return null;
  if (ml > 0) return 100 / (ml + 100);
  return (-ml) / ((-ml) + 100);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * BaselinePredictor: returns P(home wins) in [0,1]
 * Uses moneylines if available; nudges with spread if present.
 */
export class BaselinePredictor {
  league: string;
  constructor(league: string) {
    this.league = league.toLowerCase();
  }

  predict(feat: {
    moneyline_home?: number | null;
    moneyline_away?: number | null;
    line_home?: number | null; // home spread (negative if favorite)
    line_away?: number | null;
  }): number {
    let ph = impliedFromMoneyline(feat.moneyline_home);
    let pa = impliedFromMoneyline(feat.moneyline_away);

    if (ph == null && pa != null) ph = 1 - pa;
    if (pa == null && ph != null) pa = 1 - ph;

    // If both missing, start neutral
    if (ph == null) ph = 0.5;

    // Spread adjustment (small nudge)
    // Home negative spread => favorite at home => increase P(home)
    let spreadHome: number | null = null;
    if (typeof feat.line_home === "number") spreadHome = feat.line_home;
    else if (typeof feat.line_away === "number") spreadHome = -feat.line_away;

    if (typeof spreadHome === "number") {
      // Nudge scaled ~ +/-0.12 max for very large spreads
      const adj = Math.max(-0.12, Math.min(0.12, -spreadHome / 25));
      ph = clamp01(ph + adj);
    }

    return clamp01(ph);
  }
}
