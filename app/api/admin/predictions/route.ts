import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServerAdmin";

const SUGGESTED_COLUMNS = [
  { name: "external_id", type: "text", notNull: true },
  { name: "sport", type: "text", notNull: true },
  { name: "season", type: "integer", notNull: true },
  { name: "week", type: "integer", notNull: true },
  { name: "game_date", type: "date", notNull: false },
  { name: "commence_time", type: "timestamp with time zone", notNull: false },
  { name: "home_team", type: "text", notNull: false },
  { name: "away_team", type: "text", notNull: false },
  { name: "pick_moneyline", type: "text", notNull: false },
  { name: "pick_spread", type: "text", notNull: false },
  { name: "pick_total", type: "text", notNull: false },
  { name: "conf_moneyline", type: "integer", notNull: false },
  { name: "conf_spread", type: "integer", notNull: false },
  { name: "conf_total", type: "integer", notNull: false },
  { name: "model_confidence", type: "integer", notNull: false },
  { name: "predicted_winner", type: "text", notNull: true },
  { name: "confidence", type: "integer", notNull: true },
  { name: "moneyline_home", type: "integer", notNull: false },
  { name: "moneyline_away", type: "integer", notNull: false },
  { name: "spread_line", type: "numeric", notNull: false },
  { name: "spread_price_home", type: "integer", notNull: false },
  { name: "spread_price_away", type: "integer", notNull: false },
  { name: "total_line", type: "numeric", notNull: false },
  { name: "total_over_price", type: "integer", notNull: false },
  { name: "total_under_price", type: "integer", notNull: false },
  { name: "analysis", type: "text", notNull: false },
  { name: "source_tag", type: "text", notNull: false },
  { name: "result_moneyline", type: "text", notNull: false },
  { name: "result_spread", type: "text", notNull: false },
  { name: "result_total", type: "text", notNull: false },
  { name: "settled_at", type: "timestamp with time zone", notNull: false },
  { name: "grade", type: "text", notNull: false },
  { name: "home_score", type: "integer", notNull: false },
  { name: "away_score", type: "integer", notNull: false },
  { name: "result_status", type: "text", notNull: false },
  { name: "actual_winner", type: "text", notNull: false },
];

export async function GET() {
  const { data: cols, error } = await supabaseAdmin
    .from("v_table_columns")
    .select("column_name")
    .eq("table_name", "ai_research_predictions");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const existing = new Set((cols ?? []).map((c: any) => c.column_name));
  const missing = SUGGESTED_COLUMNS.filter(c => !existing.has(c.name));

  const parts: string[] = [];
  parts.push(`-- Create table if you don't have it yet`);
  parts.push(`CREATE TABLE IF NOT EXISTS public.ai_research_predictions (`);
  parts.push(`  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),`);
  parts.push(`  created_at timestamptz NOT NULL DEFAULT now()`);
  parts.push(`);`);
  for (const m of missing) {
    const nn = m.notNull ? " NOT NULL" : "";
    parts.push(`ALTER TABLE public.ai_research_predictions ADD COLUMN IF NOT EXISTS ${m.name} ${m.type}${nn};`);
  }
  parts.push(`CREATE UNIQUE INDEX IF NOT EXISTS ai_research_predictions_external_sport_key ON public.ai_research_predictions (external_id, sport);`);

  return NextResponse.json({
    ok: true,
    have: Array.from(existing).sort(),
    missing: missing.map(m => m.name),
    suggested_sql: parts.join("\n")
  });
}
