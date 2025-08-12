import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ADMIN_TOKEN =
  process.env.PREDICTIONS_ADMIN_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

type GradeItem = {
  external_id?: string;        // preferred if you have it
  home_team?: string;          // fallback selector with away_team + date
  away_team?: string;
  commence_time?: string;      // ISO (optional when using external_id)
  home_score: number;
  away_score: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const token = req.headers["x-admin-token"];
    if (!token || token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sport = String(req.query.sport || "mlb").toLowerCase();
    const date = String(req.query.date || "").slice(0, 10); // YYYY-MM-DD or blank

    const body = (req.body || {}) as { results?: GradeItem[] };
    const items: GradeItem[] = Array.isArray(body) ? body : body.results || [];
    if (!items.length) {
      return res.status(400).json({ error: "Provide JSON body with results: GradeItem[]" });
    }

    let updated = 0;
    for (const it of items) {
      const actual_winner =
        it.home_score === it.away_score
          ? null
          : it.home_score > it.away_score
          ? "HOME"
          : "AWAY";

      // locate the row
      let select = supabase
        .from("ai_research_predictions")
        .select("external_id, predicted_winner, home_team, away_team")
        .eq("sport", sport)
        .limit(1);
      if (it.external_id) {
        select = select.eq("external_id", it.external_id);
      } else {
        if (date) select = select.eq("game_date", date);
        if (it.home_team) select = select.eq("home_team", it.home_team);
        if (it.away_team) select = select.eq("away_team", it.away_team);
      }
      const { data: rows, error: selErr } = await select;
      if (selErr) throw selErr;
      const row = rows?.[0];
      if (!row?.external_id) continue;

      const result_status =
        actual_winner === null
          ? "PUSH"
          : winnerTeam(actual_winner, row) === row.predicted_winner
          ? "WIN"
          : "LOSE";

      const { error: upErr } = await supabase
        .from("ai_research_predictions")
        .update({
          home_score: it.home_score,
          away_score: it.away_score,
          actual_winner: winnerTeam(actual_winner, row),
          result_status,
        })
        .eq("external_id", row.external_id);

      if (upErr) throw upErr;
      updated++;
    }

    return res.status(200).json({ ok: true, sport, date: date || null, updated });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}

function winnerTeam(flag: "HOME" | "AWAY" | null, row: { home_team?: string; away_team?: string }) {
  if (flag === "HOME") return row.home_team || null;
  if (flag === "AWAY") return row.away_team || null;
  return null;
}
