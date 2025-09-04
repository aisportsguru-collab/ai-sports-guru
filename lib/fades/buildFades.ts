import { getOddsRange, NormalizedGame } from "@/lib/odds";
import { createPredictor, inferPreds } from "@/lib/model/infer";

function impliedFromMoneyline(ml?: number | null): number | null {
  if (ml == null || Number.isNaN(ml)) return null;
  if (ml > 0) return 100 / (ml + 100);
  return (-ml) / ((-ml) + 100);
}

type FadeItem = {
  game_id: string;
  league: string;
  home_team: string;
  away_team: string;
  game_time: string | null;
  asg_prob?: number | null;
  asg_pick?: string | null;
  public_side: "home" | "away";
  public_pct: number; // 0..1
};

function publicFromLines(g: NormalizedGame): { side: "home" | "away"; pct: number } | null {
  const ph = impliedFromMoneyline(g.moneyline_home);
  const pa = impliedFromMoneyline(g.moneyline_away);
  if (ph == null && pa == null) return null;

  let side: "home" | "away" = "home";
  let pct = 0.5;

  if (ph != null && pa != null) {
    side = ph >= pa ? "home" : "away";
    pct = Math.max(ph, pa);
  } else if (ph != null) {
    side = ph >= 0.5 ? "home" : "away";
    pct = Math.max(ph, 1 - ph);
  } else if (pa != null) {
    side = pa >= 0.5 ? "away" : "home";
    pct = Math.max(pa, 1 - pa);
  }

  // Clamp into [0.5, 0.99] so it looks like a public lean
  pct = Math.min(Math.max(pct, 0.5), 0.99);
  return { side, pct };
}

export async function buildFades(params: {
  league: string;          // "all" or a league
  days: number;            // horizon days
  publicThreshold: number; // e.g., 60
  minConfidence: number;   // e.g., 55
}) {
  const leagues = params.league === "all"
    ? ["nfl", "mlb", "ncaaf"]
    : [params.league.toLowerCase()];

  const out: FadeItem[] = [];

  for (const lg of leagues) {
    const odds = await getOddsRange({ league: lg, days: params.days });
    if (!odds.length) continue;

    const predictor = await createPredictor(lg);
    const items = await inferPreds(lg, predictor, odds);

    for (const it of items) {
      const pub = publicFromLines(it);
      if (!pub) continue;

      const modelSide = it.asg_pick === it.home_team ? "home"
        : it.asg_pick === it.away_team ? "away"
        : null;
      if (!modelSide) continue;

      // Thresholds
      const pubPct = pub.pct * 100;
      const confPct = it.asg_prob != null ? Math.abs(it.asg_prob - 0.5) * 200 : 0;

      if (pubPct < params.publicThreshold) continue;
      if (confPct < params.minConfidence) continue;

      // Contrarian: model disagrees with the public-lean side
      if (modelSide !== pub.side) {
        out.push({
          game_id: it.game_id,
          league: lg,
          home_team: it.home_team,
          away_team: it.away_team,
          game_time: it.game_time ?? null,
          asg_prob: it.asg_prob ?? null,
          asg_pick: it.asg_pick ?? null,
          public_side: pub.side,
          public_pct: pub.pct,
        });
      }
    }
  }

  // Sort by public % then confidence desc (most “faded” first)
  out.sort((a, b) => {
    if (b.public_pct !== a.public_pct) return b.public_pct - a.public_pct;
    const ca = a.asg_prob != null ? Math.abs(a.asg_prob - 0.5) : 0;
    const cb = b.asg_prob != null ? Math.abs(b.asg_prob - 0.5) : 0;
    return cb - ca;
  });

  return out;
}
