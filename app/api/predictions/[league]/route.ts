import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SPORT_KEY: Record<string, string> = {
  nfl: "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  nba: "basketball_nba",
  wnba: "basketball_wnba",
  nhl: "icehockey_nhl",
  mlb: "baseball_mlb",
};

const DEFAULT_RANGE: Record<string, number> = {
  nfl: 14,
  ncaaf: 2,
  ncaab: 2,
  nba: 2,
  wnba: 2,
  nhl: 2,
  mlb: 2,
};

// --- file helpers ------------------------------------------------------------

function findFile(rel: string): string | null {
  // try a few common locations where your dev workflow may have written the files
  const tries = [
    path.join(process.cwd(), rel),                      // project root
    path.join(process.cwd(), "backend", rel),           // backend/
    path.join(process.cwd(), "..", rel),                // parent (if running from subdir)
    path.join(__dirname, "..", "..", "..", "..", rel),  // route dir -> root
    path.join(__dirname, "..", "..", "..", "..", "backend", rel),
  ];
  for (const p of tries) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function loadJson<T = any>(file: string | null, fallback: T): T {
  if (!file) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

// --- value helpers -----------------------------------------------------------

function numOrNull(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d+\-\.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractSnapshot(bookmakers: any[], home: string, away: string) {
  const pickBook =
    bookmakers?.find((b: any) => b?.key === "draftkings") ?? bookmakers?.[0];

  const out: any = {
    ml_home: null,
    ml_away: null,
    spread_home_points: null,
    spread_home_price: null,
    spread_away_points: null,
    spread_away_price: null,
    total_points: null,
    over_price: null,
    under_price: null,
  };

  const markets = pickBook?.markets ?? [];

  // moneyline
  const h2h = markets.find((m: any) => m.key === "h2h");
  if (h2h?.outcomes?.length) {
    const h = h2h.outcomes.find((o: any) => o.name === home);
    const a = h2h.outcomes.find((o: any) => o.name === away);
    out.ml_home = numOrNull(h?.price ?? h?.price_american);
    out.ml_away = numOrNull(a?.price ?? a?.price_american);
  }

  // spreads
  const spreads = markets.find((m: any) => m.key === "spreads");
  if (spreads?.outcomes?.length) {
    const h = spreads.outcomes.find((o: any) => o.name === home);
    const a = spreads.outcomes.find((o: any) => o.name === away);
    const hPts = typeof h?.point === "number" ? h.point : numOrNull(h?.point);
    const aPts = typeof a?.point === "number" ? a.point : numOrNull(a?.point);
    out.spread_home_points = hPts;
    out.spread_home_price = numOrNull(h?.price ?? h?.price_american);
    out.spread_away_points = aPts;
    out.spread_away_price = numOrNull(a?.price ?? a?.price_american);
  }

  // totals
  const totals = markets.find((m: any) => m.key === "totals");
  if (totals?.outcomes?.length) {
    const over = totals.outcomes.find((o: any) => /^over/i.test(o.name));
    const under = totals.outcomes.find((o: any) => /^under/i.test(o.name));
    const overPt =
      typeof over?.point === "number" ? over.point : numOrNull(over?.point);
    const underPt =
      typeof under?.point === "number" ? under.point : numOrNull(under?.point);
    out.total_points = overPt ?? underPt ?? null;
    out.over_price = numOrNull(over?.price ?? over?.price_american);
    out.under_price = numOrNull(under?.price ?? under?.price_american);
  }

  return out;
}

type PredMap = Record<
  string,
  { moneyline?: string; spread?: string; total?: string; confidence?: number }
>;

/** supports both earlier shapes we used */
function buildPredIndex(predsRaw: any): PredMap {
  const out: PredMap = {};
  if (!predsRaw) return out;

  // Case A: direct map by game_id
  // { "<gameId>": { moneyline, spread, total, confidence }, ... }
  if (!Array.isArray(predsRaw)) {
    for (const [k, v] of Object.entries<any>(predsRaw)) {
      if (v && (v.moneyline || v.spread || v.total || v.confidence != null)) {
        out[k] = {
          moneyline: v.moneyline ?? null,
          spread: v.spread ?? null,
          total: v.total ?? null,
          confidence: v.confidence ?? null,
        };
      } else if (v?.ai_prediction) {
        out[k] = {
          moneyline: v.ai_prediction.moneyline ?? null,
          spread: v.ai_prediction.spread ?? null,
          total: v.ai_prediction.total ?? null,
          confidence: v.ai_prediction.confidence ?? null,
        };
      }
    }
    return out;
  }

  // Case B: array of objects with id + ai_prediction, or nested arrays keyed per sport
  for (const item of predsRaw) {
    if (!item) continue;
    if (item.id && (item.ai_prediction || item.moneyline || item.spread || item.total)) {
      const v = item.ai_prediction ?? item;
      out[item.id] = {
        moneyline: v.moneyline ?? null,
        spread: v.spread ?? null,
        total: v.total ?? null,
        confidence: v.confidence ?? null,
      };
    }
  }
  return out;
}

export const revalidate = 60;

export async function GET(req: Request, ctx: { params: { league: string } }) {
  try {
    const leagueSlug = (ctx.params?.league || "").toLowerCase();
    const sportKey = SPORT_KEY[leagueSlug];
    if (!sportKey) {
      return NextResponse.json({ error: `Unknown league: ${leagueSlug}` }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const rangeParam = Number(searchParams.get("range"));
    const fromParam = searchParams.get("from"); // YYYY-MM-DD
    const toParam = searchParams.get("to");     // YYYY-MM-DD

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const dateFrom = fromParam ? new Date(fromParam) : todayUTC;
    const rangeDays =
      Number.isFinite(rangeParam) && rangeParam > 0
        ? rangeParam
        : (DEFAULT_RANGE[leagueSlug] ?? 2);
    const dateTo = toParam ? new Date(toParam) : new Date(dateFrom.getTime() + rangeDays * 24 * 3600 * 1000);

    // Load files from flexible locations
    const gamesPath = findFile("gamesData.json");
    const predsPath = findFile("predictionsData.json");
    const gamesData = loadJson<Record<string, any[]>>(gamesPath, {});
    const predsRaw = loadJson<any>(predsPath, {});
    const predIndex = buildPredIndex(predsRaw);

    const all = gamesData[sportKey] ?? [];
    const fromMs = dateFrom.getTime();
    const toMs = dateTo.getTime();

    const filtered = all.filter((g) => {
      const cm = Date.parse(g?.commence_time ?? "");
      return Number.isFinite(cm) && cm >= fromMs && cm < toMs;
    });

    const games = filtered
      .map((g) => {
        const snapshot = extractSnapshot(g?.bookmakers ?? [], g.home_team, g.away_team);
        const p = predIndex[g.id] ?? {};
        return {
          id: g.id,
          league: sportKey,
          home: g.home_team,
          away: g.away_team,
          start: g.commence_time,
          ...snapshot,
          model_moneyline: p.moneyline ?? null,
          model_spread: p.spread ?? null,
          model_total: p.total ?? null,
          model_confidence: p.confidence ?? null,
        };
      })
      .sort((a, b) => (a.start < b.start ? -1 : 1));

    return NextResponse.json({
      league: leagueSlug,
      sport_key: sportKey,
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
      count: games.length,
      games,
      _meta: {
        gamesPath: gamesPath ?? null,
        predsPath: predsPath ?? null,
        totalSourceGames: (gamesData[sportKey] ?? []).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
