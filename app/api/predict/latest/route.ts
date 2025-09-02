import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime (not edge)

type GameRow = {
  external_id: string;
  sport: string;
  commence_time: string; // ISO
  game_date: string;     // YYYY-MM-DD
  home_team: string;
  away_team: string;
  moneyline_home: number | null;
  moneyline_away: number | null;
  spread_line: number | null;
  spread_price_home: number | null;
  spread_price_away: number | null;
  total_points: number | null;
  over_price: number | null;
  under_price: number | null;
  pick_moneyline: string | null;
  pick_spread: string | null;
  pick_total: string | null;
  conf_moneyline: number | null;
  conf_spread: number | null;
  conf_total: number | null;
};

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseIntOr<T extends number>(v: string | null, def: T): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
}

function ymd(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const league = (url.searchParams.get("league") || "").toLowerCase();
  const baseDate = url.searchParams.get("date");
  const days = parseIntOr(url.searchParams.get("days"), 14);
  const debugFlag = url.searchParams.get("debug") === "1";

  if (!["nfl", "ncaaf", "mlb"].includes(league)) {
    return NextResponse.json({ ok: false, error: "Unsupported league" }, { status: 400 });
  }

  try {
    // Date window
    const start = baseDate ? new Date(baseDate + "T00:00:00Z") : new Date();
    const end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + days);

    const fromYMD = ymd(start);
    const toYMD = ymd(end);

    // Supabase client (Service Role if present; otherwise anon)
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SR =
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
      getEnv("SUPABASE_SERVICE_ROLE") ||
      getEnv("SUPABASE_SERVICE_ROLE_KEY".replace(/_KEY$/, "")); // defensive
    const ANON = getEnv("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !(SR || ANON)) {
      return NextResponse.json({
        ok: false,
        error: "Supabase env not configured",
        debug: debugFlag ? { SUPABASE_URL: !!SUPABASE_URL, SR: !!SR, ANON: !!ANON } : undefined
      }, { status: 500 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SR || (ANON as string), {
      auth: { persistSession: false }
    });

    // v_predictions_latest has one latest row per (external_id, sport)
    const { data, error } = await supabase
      .from("v_predictions_latest")
      .select("*")
      .eq("sport", league)
      .gte("game_date", fromYMD)
      .lt("game_date", toYMD)
      .order("commence_time", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as GameRow[];

    const games = rows.map((r) => ({
      game_id: r.external_id,
      league: r.sport,
      start: r.commence_time,
      home: r.home_team,
      away: r.away_team,
      ml_home: r.moneyline_home,
      ml_away: r.moneyline_away,
      spread_line: r.spread_line,
      spread_home_price: r.spread_price_home,
      spread_away_price: r.spread_price_away,
      total_points: r.total_points,
      over_price: r.over_price,
      under_price: r.under_price,
      pick_moneyline: r.pick_moneyline,
      pick_spread: r.pick_spread,
      pick_total: r.pick_total,
      conf_moneyline: r.conf_moneyline,
      conf_spread: r.conf_spread,
      conf_total: r.conf_total,
    }));

    return NextResponse.json({
      ok: true,
      league,
      from: fromYMD,
      to: toYMD,
      count: games.length,
      games,
      debug: debugFlag ? { used_service_role: !!SR } : undefined
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
