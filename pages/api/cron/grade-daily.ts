import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchScores, parseFinalScores } from "../../../lib/scores";

const CRON_SECRET = process.env.CRON_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// the sports you want to grade daily; reuse CRON_SPORTS if set
function listSports(): string[] {
  const env = (process.env.CRON_SPORTS || "mlb").split(",").map(s => s.trim().toLowerCase());
  return env.filter(Boolean);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const key = String(req.query.key || "");
    if (!CRON_SECRET || key !== CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sports = listSports();
    const results: Record<string, { checked: number; updated: number }> = {};

    for (const sport of sports) {
      const games = await fetchScores(sport, 2); // look back 2 days
      let updated = 0;
      let checked = 0;

      for (const g of games) {
        const final = parseFinalScores(g);
        if (!final) continue; // only grade completed with final scores
        checked++;

        // winner flag HOME/AWAY/NULL (tie)
        const winnerFlag = final.home === final.away ? null : (final.home > final.away ? "HOME" : "AWAY");

        // update by external_id if it matches, else try team+date fallback
        const dateKey = (g.commence_time || "").slice(0, 10);
        const sel = supabase
          .from("ai_research_predictions")
          .select("external_id, predicted_winner, home_team, away_team")
          .eq("sport", sport)
          .eq("game_date", dateKey)
          .eq("home_team", g.home_team)
          .eq("away_team", g.away_team)
          .limit(1);

        const { data: rows, error: selErr } = await sel;
        if (selErr) throw selErr;
        const row = rows?.[0];
        if (!row?.external_id) continue;

        const actualWinnerTeam =
          winnerFlag === "HOME" ? row.home_team :
          winnerFlag === "AWAY" ? row.away_team : null;

        const result_status =
          winnerFlag === null ? "PUSH" :
          actualWinnerTeam === row.predicted_winner ? "WIN" : "LOSE";

        const { error: upErr } = await supabase
          .from("ai_research_predictions")
          .update({
            home_score: final.home,
            away_score: final.away,
            actual_winner: actualWinnerTeam,
            result_status,
          })
          .eq("external_id", row.external_id);

        if (upErr) throw upErr;
        updated++;
      }

      results[sport] = { checked, updated };
    }

    return res.status(200).json({ ok: true, results });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
