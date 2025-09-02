import { NextResponse } from "next/server";
import { getOddsRange } from "@/lib/odds";
import { inferPreds } from "@/lib/model/infer";
import { supabaseService } from "@/lib/supabaseServerAdmin";

function parseParams(url: URL) {
  const league = (url.searchParams.get("league") || "nfl").toLowerCase();
  const days = Math.max(1, Math.min(31, Number(url.searchParams.get("days") || "14")));
  const store = url.searchParams.get("store") === "1";
  const debug = url.searchParams.get("debug") === "1";
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));
  const to = new Date(from.getTime() + days * 24 * 3600 * 1000);
  return { league, from, to, store, debug };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { league, from, to, store, debug } = parseParams(url);

  try {
    // 1) pull odds → NormalGame[]
    const games = await getOddsRange(league, from, to);

    // 2) infer predictions
    const picks = await inferPreds(games, league);

    // 3) upsert into Supabase (if store=1)
    let stored = 0;
    let insert_error: string | null = null;

    if (store) {
      try {
        const sb = supabaseService();
        // Map to DB rows
        const rows = picks.map((p) => ({
          sport: league,
          game_date: p.kickoffISO.slice(0, 10),
          commence_time: p.kickoffISO,
          home_team: p.home,
          away_team: p.away,

          moneyline_home: p.ml_home,
          moneyline_away: p.ml_away,
          spread_line: p.spread_line,
          spread_price_home: p.spread_home_price,
          spread_price_away: p.spread_away_price,
          total_line: p.total_points,
          over_price: p.over_price,
          under_price: p.under_price,

          pick_moneyline: p.pick_moneyline,
          pick_spread: p.pick_spread,
          pick_total: p.pick_total,
          conf_moneyline: p.conf_moneyline,
          conf_spread: p.conf_spread,
          conf_total: p.conf_total,

          // optional: store probabilities & edges
          model_p_home_win: p.p_home_win,
          model_p_home_cover: p.p_home_cover,
          model_p_over: p.p_over,
          edge_moneyline: p.edge_moneyline,
          edge_spread: p.edge_spread,
          edge_total: p.edge_total,

          source_tag: "model_v1",
          // a stable unique key (you may have external_id in getOddsRange; if so, use that)
          external_id: `${league}|${p.kickoffISO}|${p.home}|${p.away}`
        }));

        // Upsert on unique external_id (or your composite index)
        const { error, count } = await sb
          .from("ai_research_predictions")
          .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false, count: "exact" });

        if (error) throw error;
        stored = count ?? 0;
      } catch (e: any) {
        insert_error = String(e?.message || e);
      }
    }

    return NextResponse.json({
      ok: true,
      league,
      from: from.toISOString(),
      to: to.toISOString(),
      stored,
      insert_error,
      note: bundleNote(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) });
  }
}

function bundleNote() {
  // Tiny message letting us know whether we’re using real models or fallback.
  // We can improve this later by exporting a flag from infer.
  return "Model pipeline executed (models used if available; otherwise market-aware fallback).";
}
