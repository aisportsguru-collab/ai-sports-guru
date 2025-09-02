// Advanced baseline model: combines market-implied probabilities
// with simple heuristics to produce moneyline, spread, and total picks.
// Accepts both your API route snapshot keys and pipeline snapshot keys.

export type Snapshot = {
  home_team?: string;
  away_team?: string;

  // Moneyline (two naming styles supported)
  ml_home?: number | null;
  ml_away?: number | null;
  moneyline_home?: number | null;
  moneyline_away?: number | null;

  // Spread line + prices
  spread_line?: number | null;              // home-centric spread line (home's number; away = -home)
  spread_home_price?: number | null;
  spread_away_price?: number | null;
  spread_price_home?: number | null;        // alias
  spread_price_away?: number | null;        // alias

  // Totals (two naming styles supported)
  total_points?: number | null;
  total_line?: number | null;               // alias
  over_price?: number | null;
  under_price?: number | null;
  total_over_price?: number | null;         // alias
  total_under_price?: number | null;        // alias
};

export type Picks = {
  pick_moneyline: "HOME" | "AWAY" | null;
  pick_spread: string | null;               // e.g., "HOME -2.5"
  pick_total: string | null;                // e.g., "Under 47.5"

  conf_moneyline: number | null;            // 0-100
  conf_spread: number | null;               // 0-100
  conf_total: number | null;                // 0-100
  model_confidence: number | null;          // aggregate
  rationale?: string | null;
};

/** Convert American odds to implied probability (no vig removed). */
function impliedFromAmerican(odds: number | null | undefined): number | null {
  if (odds === null || odds === undefined) return null;
  if (odds === 0) return null;
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

/** Clamp a number */
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Map probability in [0.50..0.75+] to confidence in [55..80] */
function confFromProb(p: number | null): number | null {
  if (p === null) return null;
  const base = 55 + ((p - 0.5) / 0.25) * 20; // 55 at 0.50, 75 at 0.75
  return Math.round(clamp(base, 50, 80));
}

/** Nicely format a spread string like "HOME -2.5" / "AWAY +3" */
function fmtSpread(side: "HOME" | "AWAY", line: number) {
  const signed = line > 0 ? `+${line}` : `${line}`;
  return `${side} ${signed}`;
}

/** Nicely format totals: "Over 47.5" / "Under 8.5" */
function fmtTotal(kind: "Over" | "Under", pts: number) {
  return `${kind} ${Number(pts)}`;
}

/** Choose side by comparing two implied probabilities; returns "HOME" | "AWAY" or null if unknown. */
function sideByProb(ph: number | null, pa: number | null): "HOME" | "AWAY" | null {
  if (ph === null && pa === null) return null;
  if (ph !== null && pa === null) return "HOME";
  if (pa !== null && ph === null) return "AWAY";
  return ph! >= pa! ? "HOME" : "AWAY";
}

/** Main model */
export function baselineAll(input: Snapshot): Picks {
  // Normalize keys (support both route.ts and pipeline.ts shapes)
  const home = input.home_team ?? "HOME";
  const away = input.away_team ?? "AWAY";

  const mlHome = input.ml_home ?? input.moneyline_home ?? null;
  const mlAway = input.ml_away ?? input.moneyline_away ?? null;

  const spreadLineHome = input.spread_line ?? null; // away line = -spreadLineHome
  const spHomePrice =
    input.spread_home_price ?? input.spread_price_home ?? null;
  const spAwayPrice =
    input.spread_away_price ?? input.spread_price_away ?? null;

  const totalPts = input.total_points ?? input.total_line ?? null;
  const overPrice = input.over_price ?? input.total_over_price ?? null;
  const underPrice = input.under_price ?? input.total_under_price ?? null;

  // MONEYLINE
  const pMLHome = impliedFromAmerican(mlHome);
  const pMLAway = impliedFromAmerican(mlAway);
  let pick_moneyline: "HOME" | "AWAY" | null = sideByProb(pMLHome, pMLAway);
  let conf_moneyline = confFromProb(
    pick_moneyline === "HOME" ? pMLHome : pick_moneyline === "AWAY" ? pMLAway : null
  );

  // If no ML odds, soft fallback to slight home bias
  if (!pick_moneyline) {
    pick_moneyline = "HOME";
    conf_moneyline = 58;
  }

  // SPREAD
  let pick_spread: string | null = null;
  let conf_spread: number | null = null;

  if (spreadLineHome !== null) {
    const pSpHome = impliedFromAmerican(spHomePrice);
    const pSpAway = impliedFromAmerican(spAwayPrice);

    // Decide side primarily by spread prices, fallback to sign of line
    let spreadSide = sideByProb(pSpHome, pSpAway);
    if (!spreadSide) {
      spreadSide = spreadLineHome < 0 ? "HOME" : "AWAY";
    }

    const chosenLine = spreadSide === "HOME" ? spreadLineHome : -spreadLineHome;
    pick_spread = fmtSpread(spreadSide, Number(chosenLine.toFixed(1)));

    // Confidence: blend spread market prob with ML signal if aligned
    const pChosen =
      spreadSide === "HOME" ? pSpHome ?? pMLHome : pSpAway ?? pMLAway;
    let c = confFromProb(pChosen ?? 0.55) ?? 56;

    // Small boost if ML pick aligns with spread side
    if (pick_moneyline === spreadSide) c = clamp(c + 2, 50, 82);
    conf_spread = Math.round(c);
  } else {
    // Fallback if no spread line
    pick_spread = "HOME -1.5";
    conf_spread = 55;
  }

  // TOTALS
  let pick_total: string | null = null;
  let conf_total: number | null = null;

  if (totalPts !== null) {
    const pOver = impliedFromAmerican(overPrice);
    const pUnder = impliedFromAmerican(underPrice);

    if (pOver !== null || pUnder !== null) {
      const pick = (pOver ?? 0.5) >= (pUnder ?? 0.5) ? "Over" : "Under";
      pick_total = fmtTotal(pick as "Over" | "Under", Number(totalPts));
      conf_total = confFromProb(pick === "Over" ? pOver : pUnder) ?? 56;
    } else {
      // No prices for totals, default to Under slight bias
      pick_total = fmtTotal("Under", Number(totalPts));
      conf_total = 54;
    }
  } else {
    // No total line at all — leave null to avoid fabricating
    pick_total = null;
    conf_total = null;
  }

  // Overall model confidence: average of available signals
  const confs = [conf_moneyline, conf_spread, conf_total].filter(
    (x): x is number => typeof x === "number"
  );
  const model_confidence = confs.length
    ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length)
    : (conf_moneyline ?? 58);

  const rationale = [
    `Market-implied baseline with heuristics.`,
    mlHome != null && mlAway != null
      ? `Moneyline probs: ${home} ${((pMLHome ?? 0) * 100).toFixed(1)}%, ${away} ${((pMLAway ?? 0) * 100).toFixed(1)}%.`
      : `Moneyline not fully available; applied home bias fallback.`,
    spreadLineHome != null
      ? `Spread (home line ${spreadLineHome > 0 ? "+" : ""}${spreadLineHome}): prices H ${spHomePrice ?? "?"}, A ${spAwayPrice ?? "?"}.`
      : `No spread line; used heuristic.`,
    totalPts != null
      ? `Total ${totalPts} with prices O ${overPrice ?? "?"}, U ${underPrice ?? "?"}.`
      : `No total line.`
  ].join(" ");

  return {
    pick_moneyline,
    pick_spread,
    pick_total,
    conf_moneyline: conf_moneyline ?? null,
    conf_spread: conf_spread ?? null,
    conf_total: conf_total ?? null,
    model_confidence,
    rationale
  };
}

export default baselineAll;
