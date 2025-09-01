import { NextRequest, NextResponse } from "next/server";
import { predict } from "../../../../lib/predict"; // 4 levels up to /lib/predict

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ODDS_API_KEY = process.env.ODDS_API_KEY!;
const ODDS_API_REGION = process.env.ODDS_API_REGION ?? "us";
const ODDS_API_MARKETS = process.env.ODDS_API_MARKETS ?? "h2h,spreads,totals";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

const SPORT_KEY: Record<string, string> = {
  nfl: "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  mlb: "baseball_mlb",
  nba: "basketball_nba",
  nhl: "icehockey_nhl",
  ncaab: "basketball_ncaab",
  wnba: "basketball_wnba",
};

type NormalGame = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  markets?: {
    ml?: { home?: number; away?: number };
    spread?: number | null;
    spreadPrices?: { home?: number; away?: number };
    total?: number | null;
    totalPrices?: { over?: number; under?: number };
  };
};

type SBRow = {
  external_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  game_date: string;
  moneyline_home: number | null;
  moneyline_away: number | null;
  spread_line: number | null;
  spread_price_home: number | null;
  spread_price_away: number | null;
  total_line: number | null;
  total_over_price: number | null;
  total_under_price: number | null;
  predicted_winner: string | null;
  pick_moneyline: string | null;
  pick_spread: string | null;
  pick_total: string | null;
  conf_moneyline: number | null;
  conf_spread: number | null;
  conf_total: number | null;
  model_confidence: number | null;
  source_tag: string | null;
};

async function fetchOddsWindow(league: string, fromISO: string, toISO: string): Promise<NormalGame[]> {
  if (!ODDS_API_KEY) throw new Error("Missing ODDS_API_KEY at runtime.");

  const sport = SPORT_KEY[league];
  if (!sport) throw new Error(`Unsupported league: ${league}`);

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", ODDS_API_KEY);
  url.searchParams.set("regions", ODDS_API_REGION);
  url.searchParams.set("markets", ODDS_API_MARKETS);
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");

  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`odds api error: ${r.status} ${text}`.slice(0, 500));
  }
  const raw = (await r.json()) as any[];

  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();

  const games: NormalGame[] = [];

  for (const g of raw) {
    const t = new Date(g.commence_time).getTime();
    if (Number.isFinite(t) && (t < from || t > to)) continue;

    const bk = Array.isArray(g.bookmakers) && g.bookmakers.length > 0 ? g.bookmakers[0] : null;

    let mlHome: number | undefined;
    let mlAway: number | undefined;
    let spreadLine: number | null = null;
    let spreadHomePrice: number | undefined;
    let spreadAwayPrice: number | undefined;
    let totalLine: number | null = null;
    let overPrice: number | undefined;
    let underPrice: number | undefined;

    if (bk?.markets) {
      for (const m of bk.markets) {
        if (m.key === "h2h") {
          for (const o of m.outcomes || []) {
            if (o.name === g.home_team) mlHome = o.price;
            if (o.name === g.away_team) mlAway = o.price;
          }
        }
        if (m.key === "spreads") {
          const home = (m.outcomes || []).find((o: any) => o.name === g.home_team);
          const away = (m.outcomes || []).find((o: any) => o.name === g.away_team);
          if (home?.point != null) spreadLine = Number(home.point);
          spreadHomePrice = home?.price;
          spreadAwayPrice = away?.price;
        }
        if (m.key === "totals") {
          const over = (m.outcomes || []).find((o: any) => o.name?.toUpperCase?.() === "OVER");
          const under = (m.outcomes || []).find((o: any) => o.name?.toUpperCase?.() === "UNDER");
          if (over?.point != null) totalLine = Number(over.point);
          overPrice = over?.price;
          underPrice = under?.price;
        }
      }
    }

    games.push({
      league,
      homeTeam: g.home_team,
      awayTeam: g.away_team,
      kickoffISO: g.commence_time,
      markets: {
        ml: { home: mlHome, away: mlAway },
        spread: spreadLine,
        spreadPrices: { home: spreadHomePrice, away: spreadAwayPrice },
        total: totalLine,
        totalPrices: { over: overPrice, under: underPrice },
      },
    });
  }

  return games;
}

async function storeToSupabase(rows: SBRow[]): Promise<{ stored: number; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return { stored: 0, error: "Supabase env not configured on server (SUPABASE_URL / SUPABASE_SERVICE_ROLE)." };
  }
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

  // Use UPSERT so re-runs don’t fail on unique index (external_id, sport)
  const { error, count } = await sb
    .from("ai_research_predictions")
    .upsert(rows, {
      onConflict: "external_id,sport",
      ignoreDuplicates: true,
      returning: "minimal",
      count: "exact",
    });

  if (error) {
    return { stored: 0, error: error.message };
  }
  return { stored: count ?? 0 };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const league = (searchParams.get("league") || "nfl").toLowerCase();
    const days = Math.max(1, Math.min(14, Number(searchParams.get("days") || 14)));
    const store = (searchParams.get("store") || "0") === "1";

    const now = new Date();
    const fromISO = now.toISOString();
    const toISO = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();

    const games = await fetchOddsWindow(league, fromISO, toISO);
    const picks = await predict(games);

    const rows: SBRow[] = games.map((g) => {
      const kickoffISO = g.kickoffISO;
      const game_date = kickoffISO.slice(0, 10);
      const external_id = [league, g.homeTeam.replace(/\s+/g, "_"), g.awayTeam.replace(/\s+/g, "_"), kickoffISO].join("|");

      const mlh = g.markets?.ml?.home ?? null;
      const mla = g.markets?.ml?.away ?? null;
      const sLine = g.markets?.spread ?? null;
      const spHome = g.markets?.spreadPrices?.home ?? null;
      const spAway = g.markets?.spreadPrices?.away ?? null;
      const tLine = g.markets?.total ?? null;
      const oPrice = g.markets?.totalPrices?.over ?? null;
      const uPrice = g.markets?.totalPrices?.under ?? null;

      const gamePicks = picks.filter(
        (p) => p.league === league && p.homeTeam === g.homeTeam && p.awayTeam === g.awayTeam && p.kickoffISO === g.kickoffISO
      );

      let pick_moneyline: string | null = null;
      let pick_spread: string | null = null;
      let pick_total: string | null = null;
      let conf_moneyline: number | null = null;
      let conf_spread: number | null = null;
      let conf_total: number | null = null;
      let predicted_winner: string | null = null;

      for (const p of gamePicks) {
        if (p.market === "ML") {
          pick_moneyline = p.pick;
          conf_moneyline = p.edgePct ?? 55;
          predicted_winner = p.pick === "HOME" ? g.homeTeam : g.awayTeam;
        }
        if (p.market === "SPREAD" && typeof p.line === "number") {
          pick_spread = `${p.pick} ${p.line >= 0 ? "+" : ""}${p.line}`;
          conf_spread = p.edgePct ?? 55;
        }
        if (p.market === "TOTAL" && typeof p.line === "number") {
          const side = p.pick[0] + p.pick.slice(1).toLowerCase(); // Over/Under
          pick_total = `${side} ${p.line}`;
          conf_total = p.edgePct ?? 55;
        }
      }

      return {
        external_id,
        sport: league,
        home_team: g.homeTeam,
        away_team: g.awayTeam,
        commence_time: kickoffISO,
        game_date,
        moneyline_home: mlh,
        moneyline_away: mla,
        spread_line: sLine,
        spread_price_home: spHome,
        spread_price_away: spAway,
        total_line: tLine,
        total_over_price: oPrice,
        total_under_price: uPrice,
        predicted_winner,
        pick_moneyline,
        pick_spread,
        pick_total,
        conf_moneyline,
        conf_spread,
        conf_total,
        model_confidence: Math.max(conf_moneyline ?? 0, conf_spread ?? 0, conf_total ?? 0) || null,
        source_tag: "prod_api_v1",
      };
    });

    let stored = 0;
    let insert_error: string | undefined;
    if (store) {
      const res = await storeToSupabase(rows);
      stored = res.stored;
      insert_error = res.error;
    }

    return NextResponse.json({
      ok: true,
      league,
      from: fromISO,
      to: toISO,
      stored,
      insert_error,
      note: "Pulled odds from The Odds API and generated predictions.",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
