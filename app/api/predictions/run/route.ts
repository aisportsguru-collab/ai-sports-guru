export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service key to READ games

const supabase = createClient(url, key, { auth: { persistSession: false } });

function toInt(x: number | null | undefined) {
  return x == null ? null : Math.round(x);
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const league = (u.searchParams.get("league") ?? "nfl").toLowerCase();
    const days   = Number(u.searchParams.get("days") ?? "2");

    // find candidate games
    const { data: games, error: gErr } = await supabase
      .from("games")
      .select("game_id,sport,home_team,away_team,start_time")
      .ilike("sport", league)
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + days*24*3600*1000).toISOString());

    if (gErr) return NextResponse.json({ ok:false, error: gErr.message }, { status: 500 });

    const toPredict = games ?? [];
    const rows:any[] = [];

    // ----------------------------
    // 🔧 Your model logic goes here.
    // For now, produce varied confidences so we can confirm writes.
    // Replace with real model outputs when ready.
    for (const g of toPredict) {
      rows.push({
        game_id: g.game_id,
        model_version: "ml_v1",
        moneyline_pick: g.home_team,            // placeholder
        spread_pick: g.home_team,               // placeholder
        total_pick: "under",                    // placeholder
        pred_spread_line: 0,                    // placeholder
        pred_total_line: 44,                    // placeholder
        moneyline_conf: toInt(60 + Math.random()*20),
        spread_conf:    toInt(55 + Math.random()*25),
        total_conf:     toInt(55 + Math.random()*25),
      });
    }
    // ----------------------------

    // call internal writer (same app)
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/predictions/write`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows),
    });

    const payload = await res.json();
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        scanned: toPredict.length,
        written: 0,
        failed: toPredict.length,
        error: payload?.error ?? "writer failed",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      scanned: toPredict.length,
      written: payload.inserted ?? 0,
      failed: (toPredict.length - (payload.inserted ?? 0)),
      model: "ml_v1",
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
