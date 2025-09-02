import { NextResponse } from "next/server";
import { runPredict } from "../../../lib/predict"; // adjust if your relative path differs
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // ensure process.env + Node libraries are available

type League = "nfl" | "ncaaf" | "mlb" | "nba" | "nhl" | "wnba" | "ncaab";

function getEnv(name: string, fallbackName?: string) {
  const v = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function supabaseAdmin() {
  const url = getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return { client: null as any, missing: true, reason: "Supabase env not configured on server (SUPABASE_URL / SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY)." };
  }
  return {
    client: createClient(url, serviceRole, { auth: { persistSession: false } }),
    missing: false,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const league = (searchParams.get("league") || "nfl").toLowerCase() as League;
    const days = Math.max(1, Math.min(parseInt(searchParams.get("days") || "14", 10) || 14, 30));
    const store = (searchParams.get("store") === "1");

    // Run odds fetch + model predictions
    const result = await runPredict({ league, days });

    let stored = 0;
    let insert_error: string | undefined;

    if (store) {
      const admin = supabaseAdmin();
      if (admin.missing) {
        insert_error = admin.reason;
      } else {
        // upsert into public.ai_research_predictions
        const rows = result.rows.map(r => ({
          external_id: r.external_id,
          sport: r.league,
          commence_time: r.kickoffISO,
          game_date: r.kickoffISO.slice(0,10),
          home_team: r.home,
          away_team: r.away,
          moneyline_home: r.ml_home ?? null,
          moneyline_away: r.ml_away ?? null,
          spread_line: r.spread_line ?? null,
          spread_price_home: r.spread_home_price ?? null,
          spread_price_away: r.spread_away_price ?? null,
          total_line: r.total_points ?? null,
          total_over_price: r.over_price ?? null,
          total_under_price: r.under_price ?? null,
          pick_moneyline: r.pick_moneyline ?? null,
          pick_spread: r.pick_spread ?? null,
          pick_total: r.pick_total ?? null,
          conf_moneyline: r.conf_moneyline ?? null,
          conf_spread: r.conf_spread ?? null,
          conf_total: r.conf_total ?? null,
          model_confidence: r.model_confidence ?? null,
          predicted_winner: r.predicted_winner ?? null,
          confidence: r.confidence ?? null,
          source_tag: r.source_tag ?? "baseline_v1",
        }));

        const { error, count } = await admin.client
          .from("ai_research_predictions")
          .upsert(rows, { onConflict: "external_id,sport" })
          .select("external_id", { count: "exact", head: true });

        if (error) {
          insert_error = error.message;
        } else {
          stored = count ?? 0;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      league,
      from: result.from,
      to: result.to,
      stored,
      ...(insert_error ? { insert_error } : {}),
      note: "Pulled odds from The Odds API and generated predictions.",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
