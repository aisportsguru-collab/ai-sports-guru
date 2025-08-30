import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type OddsGame = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string; // ISO
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: "h2h" | "spreads" | "totals";
      outcomes?: Array<{
        name: string; // team name or "Over"/"Under"
        price?: number | null;
        point?: number | null;
      }>;
    }>;
  }>;
};

type MobileGame = {
  id: string;
  league: string; // slug we return (nfl, mlb, etc.)
  home: string;
  away: string;
  start: string;

  // moneyline
  ml_home: number | null;
  ml_away: number | null;

  // spread
  spread_home_points: number | null;
  spread_home_price: number | null;
  spread_away_points: number | null;
  spread_away_price: number | null;

  // totals
  total_points: number | null;
  over_price: number | null;
  under_price: number | null;

  // AI (real or fallback)
  model_moneyline: string | null;
  model_spread: string | null;
  model_total: string | null;
  model_confidence: number | null;
};

const SPORT_KEY_MAP: Record<string, string> = {
  nfl: "americanfootball_nfl",
  nba: "basketball_nba",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  wnba: "basketball_wnba",
};

function readJSON<T = any>(p: string): T {
  const abs = path.join(process.cwd(), p);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function pickDraftKingsSnapshot(game: OddsGame) {
  const book =
    game.bookmakers.find((b) => b.key === "draftkings") ?? game.bookmakers[0];

  let ml_home: number | null = null;
  let ml_away: number | null = null;
  let spread_home_points: number | null = null;
  let spread_home_price: number | null = null;
  let spread_away_points: number | null = null;
  let spread_away_price: number | null = null;
  let total_points: number | null = null;
  let over_price: number | null = null;
  let under_price: number | null = null;

  if (book?.markets) {
    for (const m of book.markets) {
      const outcomes = (m as any).outcomes || [];
      if (m.key === "h2h") {
        const h = outcomes.find((o: any) => o.name === game.home_team);
        const a = outcomes.find((o: any) => o.name === game.away_team);
        ml_home = h?.price ?? null;
        ml_away = a?.price ?? null;
      } else if (m.key === "spreads") {
        const h = outcomes.find((o: any) => o.name === game.home_team);
        const a = outcomes.find((o: any) => o.name === game.away_team);
        spread_home_points = h?.point ?? null;
        spread_home_price = h?.price ?? null;
        spread_away_points = a?.point ?? null;
        spread_away_price = a?.price ?? null;
      } else if (m.key === "totals") {
        const over = outcomes.find((o: any) => (o.name || "").toLowerCase() === "over");
        const under = outcomes.find((o: any) => (o.name || "").toLowerCase() === "under");
        total_points = (over?.point ?? under?.point) ?? null;
        over_price = over?.price ?? null;
        under_price = under?.price ?? null;
      }
    }
  }

  return {
    ml_home,
    ml_away,
    spread_home_points,
    spread_home_price,
    spread_away_points,
    spread_away_price,
    total_points,
    over_price,
    under_price,
  };
}

/**
 * Simple deterministic fallback picks from odds when AI is missing:
 * - Moneyline: pick the shorter price (more negative) or bigger + underdog value.
 * - Spread: if either side has negative points (favorite), pick that; else null.
 * - Total: if prices exist, pick the shorter (more negative) juice; else null.
 * Confidence: rough 60 by default; bump to 70 if strong favorite (|ml| >= 300).
 */
function fallbackFromOdds(
  home: string,
  away: string,
  snap: ReturnType<typeof pickDraftKingsSnapshot>
) {
  let moneyline: string | null = null;
  if (snap.ml_home != null || snap.ml_away != null) {
    const H = snap.ml_home ?? 0;
    const A = snap.ml_away ?? 0;
    // More negative is the stronger favorite; for both positive, pick larger positive (bigger payout underdog)
    if (H <= 0 && A > 0) moneyline = home;
    else if (A <= 0 && H > 0) moneyline = away;
    else {
      // both same sign or null mixing—fall back to min by absolute implied prob via American odds
      const fav =
        (H <= 0 && A <= 0)
          ? (Math.abs(H) >= Math.abs(A) ? home : away)
          : (Math.abs(H) <= Math.abs(A) ? home : away);
      moneyline = fav;
    }
  }

  let spread: string | null = null;
  if (snap.spread_home_points != null && snap.spread_away_points != null) {
    // Favorite carries the negative spread
    if (snap.spread_home_points < 0) spread = `${home} ${snap.spread_home_points}`;
    else if (snap.spread_away_points < 0) spread = `${away} ${snap.spread_away_points}`;
    else {
      // If both positive (rare in our cleaned data), pick the side with cheaper juice
      const hp = snap.spread_home_price ?? 0;
      const ap = snap.spread_away_price ?? 0;
      spread = (hp <= ap) ? `${home} ${snap.spread_home_points}` : `${away} ${snap.spread_away_points}`;
    }
  }

  let total: string | null = null;
  if (snap.total_points != null) {
    if (snap.over_price != null && snap.under_price != null) {
      total = (snap.over_price <= snap.under_price)
        ? `Over ${snap.total_points}`
        : `Under ${snap.total_points}`;
    } else {
      // Default to Over if only point is present
      total = `Over ${snap.total_points}`;
    }
  }

  let confidence = 60;
  const absFav = Math.max(Math.abs(snap.ml_home ?? 0), Math.abs(snap.ml_away ?? 0));
  if (absFav >= 300) confidence = 70;

  // If nothing determinable, return nulls to avoid pretending certainty
  if (!moneyline && !spread && !total) {
    return { moneyline: null, spread: null, total: null, confidence: null };
  }
  return { moneyline, spread, total, confidence };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueSlug = (searchParams.get("league") || "").toLowerCase();

    const sportKey = SPORT_KEY_MAP[leagueSlug];
    if (!sportKey) {
      return NextResponse.json(
        { error: `Unknown league '${leagueSlug}'` },
        { status: 400 }
      );
    }

    const rangeParam = searchParams.get("range");
    const defaultRange = leagueSlug === "nfl" ? 14 : 7;
    const rangeDays = Math.max(
      1,
      Math.min(31, Number(rangeParam ?? defaultRange) || defaultRange)
    );

    const dateParam = searchParams.get("date");
    const dateFrom = dateParam
      ? new Date(dateParam + "T00:00:00Z")
      : new Date();
    const dateTo = new Date(dateFrom);
    dateTo.setUTCDate(dateFrom.getUTCDate() + rangeDays);

    const gamesData: Record<string, OddsGame[]> = readJSON("backend/gamesData.json");
    const predictionsData: Record<
      string,
      { moneyline?: string; spread?: string; total?: string; confidence?: number }
    > = readJSON("backend/predictionsData.json");

    const games = (gamesData[sportKey] || []).filter((g) => {
      const t = new Date(g.commence_time).getTime();
      return t >= dateFrom.getTime() && t < dateTo.getTime();
    });

    const out: MobileGame[] = games
      .map((g) => {
        const snap = pickDraftKingsSnapshot(g);
        const ai = predictionsData[g.id] || {};
        const hasAI =
          ai.moneyline || ai.spread || ai.total || typeof ai.confidence === "number";

        const fb = hasAI
          ? null
          : fallbackFromOdds(g.home_team, g.away_team, snap);

        return {
          id: g.id,
          league: sportKey,
          home: g.home_team,
          away: g.away_team,
          start: g.commence_time,

          ...snap,

          model_moneyline: (ai.moneyline ?? fb?.moneyline) ?? null,
          model_spread: (ai.spread ?? fb?.spread) ?? null,
          model_total: (ai.total ?? fb?.total) ?? null,
          model_confidence:
            typeof ai.confidence === "number" ? ai.confidence :
            (typeof fb?.confidence === "number" ? fb!.confidence : null),
        };
      })
      .sort((a, b) => (a.start < b.start ? -1 : 1));

    return NextResponse.json({
      league: leagueSlug,
      sport_key: sportKey,
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
      count: out.length,
      games: out,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
