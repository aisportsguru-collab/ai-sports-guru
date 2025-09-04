import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses your existing type + picker
import { pickFromOdds } from "@/backend/model/predict";

// You already have an odds range helper; if not, this one queries your own REST
async function getOddsRange(opts: { league: string; days: number }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  const url = new URL("/api/games", base);
  url.searchParams.set("league", opts.league);
  url.searchParams.set("range", String(opts.days));
  // We want odds included; /api/games already merges odds via v_latest_odds_any
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  // json.games is the merged payload your GameCard uses; keep only where any odds exist
  return (json.games || []).filter((g: any) =>
    g.moneyline_home != null ||
    g.moneyline_away != null ||
    g.spread_line   != null ||
    g.total_points  != null
  );
}

function supaService() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") || "nfl").toLowerCase();
  const days = Number(searchParams.get("days") || "14");
  const store = searchParams.get("store") === "1";

  const safe = (extra?: any) =>
    NextResponse.json({ league, ...extra }, { status: 200 });

  try {
    // 1) get games with any odds present (so we can compute picks)
    const games = await getOddsRange({ league, days });
    if (!games?.length) return safe({ count: 0, note: "no games with odds in window" });

    // 2) compute picks from current odds (deterministic)
    const rows = games.map((g: any) => {
      const pick = pickFromOdds({
        ml_home: g.moneyline_home,
        ml_away: g.moneyline_away,
        spread_line: g.spread_line,          // home line
        spread_home_price: null,             // not exposed by /api/games; safe to omit
        spread_away_price: null,             // not exposed by /api/games; safe to omit
        total_points: g.total_points,
        over_price: g.over_odds,
        under_price: g.under_odds,
      });

      return {
        game_id: g.game_uuid || g.game_id, // UUID from /api/games debug (game_uuid preferred)
        pick_ml: pick.pick_ml,
        conf_ml: pick.conf_ml,
        pick_spread: pick.pick_spread,
        conf_spread: pick.conf_spread,
        pick_total: pick.pick_total,
        conf_total: pick.conf_total,
        model_version: "v1",
        // optional: features snapshot if you want to store the lines you used
        features: {
          moneyline_home: g.moneyline_home,
          moneyline_away: g.moneyline_away,
          spread_line: g.spread_line,
          total_points: g.total_points,
          over_odds: g.over_odds,
          under_odds: g.under_odds,
        },
      };
    })
    // drop entries where all picks are null (no useful signal)
    .filter(r =>
      r.pick_ml || r.pick_spread || r.pick_total
    );

    if (!store || !rows.length) {
      return safe({ count: rows.length, stored: 0 });
    }

    // 3) upsert into public.predictions keyed by (game_id, model_version)
    const supa = supaService();
    if (!supa) {
      return safe({ count: rows.length, error: "server env missing SUPABASE_URL / SERVICE_ROLE" });
    }

    // De-dup by (game_id, model_version)
    const uniq = new Map<string, any>();
    for (const r of rows) {
      const key = `${r.game_id}:v1`;
      uniq.set(key, r);
    }
    const finalRows = Array.from(uniq.values());

    const { error } = await supa
      .from("predictions")
      .upsert(finalRows, {
        onConflict: "game_id,model_version",
        ignoreDuplicates: false,
      });

    if (error) {
      return safe({ count: 0, error: `supabase upsert: ${error.message}` });
    }

    return safe({ count: finalRows.length });
  } catch (e: any) {
    return safe({ count: 0, error: String(e?.message || e) });
  }
}
