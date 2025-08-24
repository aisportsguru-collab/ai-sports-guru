import { NextResponse } from "next/server";
import { fetchScores, parseFinalScores } from "@/lib/scores";
import { gradeResults } from "@/lib/grader";

const SPORTS = ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"] as const;

function ydayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function handle() {
  const game_date = ydayUTC();
  const summary: Record<string, any> = {};
  let totalUpdated = 0;

  for (const sport of SPORTS) {
    try {
      const games = await fetchScores(sport, 2);
      const finished = games.filter(g => g.completed);

      const items: any[] = [];
      for (const g of finished) {
        const scores = parseFinalScores(g);
        if (!scores) continue;
        const kickoffDay = (g.commence_time || "").slice(0, 10);
        if (kickoffDay !== game_date) continue;

        items.push({
          sport,
          game_date,
          home_team: g.home_team,
          away_team: g.away_team,
          home_score: scores.home,
          away_score: scores.away,
          spread_close: null,
          total_close: null,
        });
      }

      if (items.length) {
        const out = await gradeResults(items);
        summary[sport] = out;
        totalUpdated += out?.updated || 0;
      } else {
        summary[sport] = { ok: true, updated: 0, note: "No finished games for yesterday" };
      }
    } catch (e: any) {
      summary[sport] = { ok: false, error: String(e?.message || e) };
    }
  }

  return NextResponse.json({ game_date, totalUpdated, summary }, { status: 200 });
}

export async function GET() { return handle(); }
export async function POST() { return handle(); }
