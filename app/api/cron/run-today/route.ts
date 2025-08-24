import { NextResponse } from "next/server";
import { runPipelineOnce } from "@/lib/pipeline";

type Sport = "mlb" | "nfl" | "nba" | "nhl" | "ncaaf" | "ncaab" | "wnba";
const SPORTS: Sport[] = ["nfl", "nba", "mlb", "nhl", "ncaaf", "ncaab", "wnba"];

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function handle() {
  const dateISO = todayUTC();
  const results: Record<string, any> = {};
  let totalUpserted = 0;

  for (const sport of SPORTS) {
    try {
      const out = await runPipelineOnce(sport, dateISO);
      results[sport] = out;
      totalUpserted += out?.upserted || 0;
    } catch (e: any) {
      results[sport] = { error: String(e?.message || e) };
    }
  }

  return NextResponse.json({ dateISO, totalUpserted, results }, { status: 200 });
}

export async function GET() { return handle(); }
export async function POST() { return handle(); }
