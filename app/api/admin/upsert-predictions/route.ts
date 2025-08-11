// app/api/admin/upsert-predictions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InSpread = { team?: string; line?: number; edge?: number } | null;
type InOU = { total?: number; pick?: "Over" | "Under"; edge?: number } | null;

type Incoming = {
  sport: string;
  season?: number | string | null;
  week?: number | string | null;
  game_date: string; // ISO or YYYY-MM-DD
  home_team: string;
  away_team: string;
  predicted_winner: string;
  confidence?: number | null; // 0..1 or 0..100, we store as-is
  offense_favor?: string | null;
  defense_favor?: string | null;
  key_players_home?: string[] | null;
  key_players_away?: string[] | null;
  spread_pick?: InSpread;
  ou_pick?: InOU;
  analysis?: Record<string, any> | null;
  source_tag?: string | null;
};

function bad(body: any, status = 400) {
  return NextResponse.json(body, { status });
}

function ok(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  return res;
}

export async function POST(req: Request) {
  // --- Auth guard
  const adminToken = process.env.PREDICTIONS_ADMIN_TOKEN || "";
  const headerToken =
    req.headers.get("x-admin-token") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!adminToken || !headerToken || headerToken !== adminToken) {
    return bad({ error: "Unauthorized" }, 401);
  }

  // --- Env guard
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return bad({ error: "Server misconfigured" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- Parse body
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return bad({ error: "Invalid JSON" }, 400);
  }
  const entries: Incoming[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.entries)
    ? payload.entries
    : typeof payload === "object"
    ? [payload]
    : [];

  if (!entries.length) {
    return bad({ error: "No entries provided (array or {entries:[...]})" }, 400);
  }

  // --- Normalize & validate rows
  const rows = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as Incoming;
    const sport = String(e.sport || "").toLowerCase().trim();
    const game_date_raw = String(e.game_date || "").trim();
    const home_team = (e.home_team || "").toString().trim();
    const away_team = (e.away_team || "").toString().trim();
    const predicted_winner = (e.predicted_winner || "").toString().trim();

    if (!sport || !game_date_raw || !home_team || !away_team || !predicted_winner) {
      errors.push({ index: i, error: "Missing required fields (sport, game_date, home_team, away_team, predicted_winner)" });
      continue;
    }

    const season =
      e.season == null || e.season === ""
        ? 2025
        : typeof e.season === "string"
        ? parseInt(e.season, 10)
        : e.season;

    const week =
      e.week == null || e.week === ""
        ? null
        : typeof e.week === "string"
        ? parseInt(e.week, 10)
        : e.week;

    // normalize date to YYYY-MM-DD
    const game_date = game_date_raw.includes("T") ? game_date_raw.slice(0, 10) : game_date_raw;

    const confidence =
      e.confidence == null
        ? null
        : typeof e.confidence === "string"
        ? parseFloat(e.confidence)
        : e.confidence;

    const key_players_home = Array.isArray(e.key_players_home) ? e.key_players_home.map(String) : null;
    const key_players_away = Array.isArray(e.key_players_away) ? e.key_players_away.map(String) : null;

    const spread_pick = e.spread_pick && typeof e.spread_pick === "object" ? e.spread_pick : null;
    const ou_pick = e.ou_pick && typeof e.ou_pick === "object" ? e.ou_pick : null;

    rows.push({
      sport,
      season,
      week,
      game_date,
      home_team,
      away_team,
      predicted_winner,
      confidence,
      offense_favor: e.offense_favor ?? null,
      defense_favor: e.defense_favor ?? null,
      key_players_home,
      key_players_away,
      spread_pick,
      ou_pick,
      analysis: e.analysis ?? null,
      source_tag: e.source_tag ?? "manual",
    });
  }

  if (errors.length && rows.length === 0) {
    return bad({ error: "All rows invalid", details: errors }, 400);
  }

  // --- Upsert
  const { data, error } = await supabase
    .from("ai_research_predictions")
    .upsert(rows, {
      onConflict: "sport,season,week,game_date,home_team,away_team",
      ignoreDuplicates: false,
    })
    .select("id,sport,season,week,game_date,home_team,away_team");

  if (error) {
    console.error("Upsert error:", error);
    return bad({ error: "Upsert failed", detail: error }, 500);
  }

  return ok({
    ok: true,
    inserted_or_updated: data?.length || 0,
    errors,
    ids: data?.map((r) => r.id) || [],
  });
}
