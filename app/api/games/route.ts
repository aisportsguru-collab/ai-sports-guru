import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DbGame = {
  id: string;                 // UUID (primary key)
  game_id: string | null;     // external/text id (human readable)
  commence_time: string;
  sport: string;
  away_team: string;
  home_team: string;
};

type DbOdds = {
  game_id: string;            // UUID key
  league: string | null;
  updated_at: string | null;
  moneyline_home: number | null;
  moneyline_away: number | null;
  spread_line: number | null;     // home line (negative = home favored)
  total_points: number | null;
  over_odds: number | null;
  under_odds: number | null;
};

type DbPred = {
  game_uuid: string;          // UUID key (matches games.id)
  game_id_text: string | null;
  pick_ml: string | null;     // 'HOME' | 'AWAY'
  conf_ml: number | null;     // 55..100
  pick_spread: string | null; // e.g., 'HOME -3' | 'AWAY +3' | 'PICK'
  conf_spread: number | null;
  pick_total: string | null;  // e.g., 'OVER 47.5' | 'UNDER 47.5'
  conf_total: number | null;
  features?: Record<string, any> | null;
};

export type ApiGame = {
  game_id: string;            // expose text id if present, else UUID
  game_uuid: string;          // UUID for internal references
  game_time: string;
  league: string;
  away_team: string;
  home_team: string;

  moneyline_away: number | null;
  moneyline_home: number | null;
  spread_line: number | null;
  total_points: number | null;
  over_odds: number | null;
  under_odds: number | null;

  ai_ml_pick: string | null;
  ai_ml_conf: number | null;
  ai_spread_pick: string | null;
  ai_spread_conf: number | null;
  ai_total_pick: string | null;
  ai_total_conf: number | null;
  ai_total_number: number | null;
};

function clampDays(v: string | null): number {
  const n = parseInt(String(v ?? "14"), 10);
  if (!Number.isFinite(n) || n < 1 || n > 90) return 14;
  return n;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const league = (url.searchParams.get("league") || "").toLowerCase();
    const rangeDays = clampDays(url.searchParams.get("range"));
    const debug = url.searchParams.get("debug") === "1";

    if (!["nfl", "ncaaf", "mlb", "nba", "nhl", "ncaab", "wnba"].includes(league)) {
      return NextResponse.json({ error: "bad league" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return NextResponse.json(
        { error: "Supabase env missing (URL or key)" },
        { status: 500 }
      );
    }

    const db = createClient(supabaseUrl, (serviceKey || anonKey) as string, {
      auth: { persistSession: false },
    });

    // 1) Games in window (UUID `id` is the FK anchor for odds/preds)
    const nowIso = new Date().toISOString();
    const endIso = new Date(Date.now() + rangeDays * 86400000).toISOString();

    const { data: games, error: gErr } = await db
      .from("games")
      .select("id, game_id, commence_time, sport, away_team, home_team")
      .eq("sport", league)
      .gte("commence_time", nowIso)
      .lte("commence_time", endIso)
      .order("commence_time", { ascending: true });

    if (gErr) {
      return NextResponse.json({ error: `games: ${gErr.message}` }, { status: 500 });
    }

    const base = (games ?? []) as DbGame[];
    const uuids = base.map((g) => String(g.id));
    if (uuids.length === 0) {
      return NextResponse.json({ count: 0, games: [] });
    }

    // 2) Latest odds keyed by UUID
    const { data: odds, error: oErr } = await db
      .from("v_latest_odds_any")
      .select(
        "game_id, league, updated_at, moneyline_home, moneyline_away, spread_line, total_points, over_odds, under_odds"
      )
      .in("game_id", uuids);

    if (oErr) {
      return NextResponse.json({ error: `odds: ${oErr.message}` }, { status: 500 });
    }

    // 3) Predictions keyed by UUID
    const { data: preds, error: pErr } = await db
      .from("v_predictions_uuid")
      .select(
        "game_uuid, game_id_text, pick_ml, conf_ml, pick_spread, conf_spread, pick_total, conf_total, features"
      )
      .in("game_uuid", uuids);

    if (pErr) {
      return NextResponse.json({ error: `preds: ${pErr.message}` }, { status: 500 });
    }

    const oddsMap = new Map<string, DbOdds>();
    (odds ?? []).forEach((o: any) => oddsMap.set(String(o.game_id), o as DbOdds));

    const predMap = new Map<string, DbPred>();
    (preds ?? []).forEach((p: any) => predMap.set(String(p.game_uuid), p as DbPred));

    const out: ApiGame[] = base.map((g) => {
      const uuid = String(g.id);
      const o = oddsMap.get(uuid);
      const p = predMap.get(uuid);

      const modeledTotal =
        (p?.features && typeof p.features === "object"
          ? Number(
              (p.features as any).total_points ??
              (p.features as any).total ??
              NaN
            )
          : NaN);
      const ai_total_number = Number.isFinite(modeledTotal) ? modeledTotal : null;

      return {
        game_uuid: uuid,
        game_id: g.game_id || uuid, // prefer text id for UI, fallback to UUID
        game_time: new Date(g.commence_time).toISOString(),
        league: g.sport,
        away_team: g.away_team,
        home_team: g.home_team,

        moneyline_away: o?.moneyline_away ?? null,
        moneyline_home: o?.moneyline_home ?? null,
        spread_line: o?.spread_line ?? null,
        total_points: o?.total_points ?? null,
        over_odds: o?.over_odds ?? null,
        under_odds: o?.under_odds ?? null,

        ai_ml_pick: p?.pick_ml ?? null,
        ai_ml_conf: p?.conf_ml ?? null,
        ai_spread_pick: p?.pick_spread ?? null,
        ai_spread_conf: p?.conf_spread ?? null,
        ai_total_pick: p?.pick_total ?? null,
        ai_total_conf: p?.conf_total ?? null,
        ai_total_number,
      };
    });

    if (debug) {
      return NextResponse.json({
        league,
        rangeDays,
        counts: {
          games: base.length,
          odds: odds?.length ?? 0,
          preds: preds?.length ?? 0,
          merged: out.length,
          withOdds: out.filter((g) => g.moneyline_home != null || g.total_points != null).length,
          withPreds: out.filter((g) => g.ai_ml_pick || g.ai_spread_pick || g.ai_total_pick).length,
        },
        sample: {
          game: base[0],
          odds: odds?.find((o: any) => String(o.game_id) === String(base[0]?.id)) ?? null,
          pred: preds?.find((p: any) => String(p.game_uuid) === String(base[0]?.id)) ?? null,
          merged: out[0] ?? null,
        },
      });
    }

    return NextResponse.json({ count: out.length, games: out }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
