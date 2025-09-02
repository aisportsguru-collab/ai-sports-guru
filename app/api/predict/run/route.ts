import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { predict as modelPredict } from "../../../../lib/predict";

export const runtime = "nodejs"; // ensure process.env works

type League = "nfl" | "ncaaf" | "mlb";

function env(name: string, alt?: string) {
  return process.env[name] ?? (alt ? process.env[alt] : undefined);
}
function requireEnv(name: string) {
  const v = env(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function supabaseAdmin() {
  const url = env("SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE", "SUPABASE_SERVICE_ROLE_KEY"); // fallback to *_KEY
  if (!url || !serviceRole) {
    return {
      client: null as any,
      missing: true,
      which: serviceRole ? "partial" : "none",
      reason:
        "Supabase env not configured on server (need SUPABASE_URL and SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }
  return {
    client: createClient(url, serviceRole, { auth: { persistSession: false } }),
    missing: false,
    which: serviceRole === process.env.SUPABASE_SERVICE_ROLE ? "SUPABASE_SERVICE_ROLE" : "SUPABASE_SERVICE_ROLE_KEY",
  };
}

function toISO(d: Date) {
  const t = new Date(d);
  t.setSeconds(0, 0);
  return t.toISOString();
}

function americanToInt(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const n = typeof s === "number" ? s : parseInt(String(s), 10);
  return Number.isFinite(n) ? n : null;
}

async function fetchOdds(league: League, fromISO: string, toISO: string) {
  const key = requireEnv("ODDS_API_KEY");
  const region = env("ODDS_API_REGION") || "us";
  const markets = env("ODDS_API_MARKETS") || "h2h,spreads,totals";

  const sportKey =
    league === "nfl" ? "americanfootball_nfl" :
    league === "ncaaf" ? "americanfootball_ncaaf" :
    league === "mlb" ? "baseball_mlb" : league;

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", region);
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Odds API ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();

  const games = (data as any[])
    .filter(g => {
      const t = new Date(g.commence_time).getTime();
      return Number.isFinite(t) && t >= from && t <= to;
    })
    .map(g => {
      const homeTeam: string = g.home_team;
      // derive away name robustly
      const allNames = new Set<string>();
      (g.bookmakers || []).forEach((bk: any) =>
        (bk.markets || []).forEach((m: any) =>
          (m.outcomes || []).forEach((o: any) => o?.name && allNames.add(o.name))
        )
      );
      const computedAway = Array.from(allNames).find(n => n !== homeTeam);
      const awayTeam: string = computedAway || g.away_team || "Away";
      const kickoffISO: string = g.commence_time;

      let mlHome: number | null = null, mlAway: number | null = null;
      let spreadLine: number | null = null, spreadHomePrice: number | null = null, spreadAwayPrice: number | null = null;
      let totalPoints: number | null = null, overPrice: number | null = null, underPrice: number | null = null;

      (g.bookmakers || []).forEach((bk: any) => {
        (bk.markets || []).forEach((m: any) => {
          if (m.key === "h2h") {
            (m.outcomes || []).forEach((o: any) => {
              if (o.name === homeTeam) mlHome = americanToInt(o.price) ?? mlHome;
              if (o.name === awayTeam) mlAway = americanToInt(o.price) ?? mlAway;
            });
          }
          if (m.key === "spreads") {
            const outs = (m.outcomes || []).map((o: any) => ({
              point: typeof o.point === "number" ? o.point : parseFloat(o.point),
              price: americanToInt(o.price),
              isHome: o.name === homeTeam,
            })).filter((o: any) => Number.isFinite(o.point));
            outs.sort((a: any, b: any) => Math.abs(a.point) - Math.abs(b.point));
            const homeOutcome = outs.find((o: any) => o.isHome);
            const awayOutcome = outs.find((o: any) => !o.isHome);
            if (homeOutcome && awayOutcome) {
              spreadLine = homeOutcome.point;
              spreadHomePrice = homeOutcome.price ?? spreadHomePrice;
              spreadAwayPrice = awayOutcome.price ?? spreadAwayPrice;
            }
          }
          if (m.key === "totals") {
            const outs = (m.outcomes || []).map((o: any) => ({
              total: typeof o.point === "number" ? o.point : parseFloat(o.point),
              name: String(o.name || "").toUpperCase(),
              price: americanToInt(o.price),
            })).filter((o: any) => Number.isFinite(o.total));
            const over = outs.find((o: any) => o.name.includes("OVER"));
            const under = outs.find((o: any) => o.name.includes("UNDER"));
            if (over && under) {
              totalPoints = over.total;
              overPrice = over.price ?? overPrice;
              underPrice = under.price ?? underPrice;
            }
          }
        });
      });

      return {
        league,
        homeTeam,
        awayTeam,
        kickoffISO,
        markets: {
          spread: typeof spreadLine === "number" ? spreadLine : undefined,
          total: typeof totalPoints === "number" ? totalPoints : undefined,
          ml: { home: mlHome ?? undefined, away: mlAway ?? undefined },
        },
        odds: {
          ml_home: mlHome, ml_away: mlAway,
          spread_line: spreadLine, spread_home_price: spreadHomePrice, spread_away_price: spreadAwayPrice,
          total_points: totalPoints, over_price: overPrice, under_price: underPrice,
        }
      };
    });

  return games;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const league = (searchParams.get("league") || "nfl").toLowerCase() as League;
    const days = Math.max(1, Math.min(parseInt(searchParams.get("days") || "14", 10) || 14, 30));
    const store = searchParams.get("store") === "1";
    const debug = searchParams.get("debug") === "1";

    const now = new Date();
    const from = toISO(now);
    const to = toISO(new Date(now.getTime() + days * 24 * 3600 * 1000));

    // 1) pull odds
    const games = await fetchOdds(league, from, to);

    // 2) predictions
    const picks = await modelPredict(
      games.map(g => ({ league: g.league, homeTeam: g.homeTeam, awayTeam: g.awayTeam, kickoffISO: g.kickoffISO, markets: g.markets }))
    );

    const k = (h: string, a: string, t: string, m: string) => `${h}__${a}__${t}__${m}`;
    const byKey = new Map<string, any>();
    picks.forEach(p => byKey.set(k(p.homeTeam, p.awayTeam, p.kickoffISO, p.market), p));

    // 3) shape rows for DB (ADD season)
    const rows = games.map(g => {
      const ml = byKey.get(k(g.homeTeam, g.awayTeam, g.kickoffISO, "ML"));
      const sp = byKey.get(k(g.homeTeam, g.awayTeam, g.kickoffISO, "SPREAD"));
      const tt = byKey.get(k(g.homeTeam, g.awayTeam, g.kickoffISO, "TOTAL"));

      const external_id = Buffer.from(`${g.league}|${g.kickoffISO}|${g.homeTeam}|${g.awayTeam}`).toString("hex").slice(0,32);
      const season = new Date(g.kickoffISO).getUTCFullYear(); // <— required NOT NULL

      return {
        external_id,
        sport: g.league,
        season,
        commence_time: g.kickoffISO,
        game_date: g.kickoffISO.slice(0,10),
        home_team: g.homeTeam,
        away_team: g.awayTeam,

        moneyline_home: g.odds.ml_home ?? null,
        moneyline_away: g.odds.ml_away ?? null,
        spread_line: g.odds.spread_line ?? null,
        spread_price_home: g.odds.spread_home_price ?? null,
        spread_price_away: g.odds.spread_away_price ?? null,
        total_line: g.odds.total_points ?? null,
        total_over_price: g.odds.over_price ?? null,
        total_under_price: g.odds.under_price ?? null,

        pick_moneyline: ml?.pick === "HOME" ? "HOME" : ml?.pick === "AWAY" ? "AWAY" : null,
        conf_moneyline: ml?.edgePct ?? null,

        pick_spread: sp?.line !== undefined && sp?.pick ? `${sp.pick === "HOME" ? "HOME" : "AWAY"} ${sp.line}` : null,
        conf_spread: sp?.edgePct ?? null,

        pick_total: tt?.line !== undefined && tt?.pick ? `${tt.pick === "OVER" ? "Over" : "Under"} ${tt.line}` : null,
        conf_total: tt?.edgePct ?? null,

        model_confidence: Math.max(ml?.edgePct ?? 0, sp?.edgePct ?? 0, tt?.edgePct ?? 0) || null,
        predicted_winner: ml?.pick === "HOME" ? g.homeTeam : (ml?.pick === "AWAY" ? g.awayTeam : null),
        confidence: ml?.edgePct ?? null,

        source_tag: "baseline_v1",
      };
    });

    // 4) optional store to Supabase
    let stored = 0;
    let insert_error: string | undefined;
    let whichRole: string | undefined;

    if (store) {
      const admin = supabaseAdmin();
      whichRole = admin.which;
      if (admin.missing) {
        insert_error = admin.reason;
      } else {
        const up = admin.client
          .from("ai_research_predictions")
          .upsert(rows, { onConflict: "external_id,sport" })
          .select("external_id");
        const { error, data } = await up;
        if (error) insert_error = error.message;
        else stored = data?.length ?? 0;
      }
    }

    return NextResponse.json({
      ok: true,
      league, from, to,
      stored,
      ...(insert_error ? { insert_error } : {}),
      ...(debug ? { debug: { used_service_role: whichRole } } : {}),
      note: "Pulled odds from The Odds API and generated predictions.",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
