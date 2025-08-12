import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const season = req.query.season ? Number(req.query.season) : undefined;
    const date = req.query.date ? String(req.query.date) : undefined; // YYYY-MM-DD
    const team = req.query.team ? String(req.query.team) : undefined;

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 25)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("ai_research_predictions")
      .select(
        `
        external_id, game_date, home_team, away_team, commence_time,
        pick_moneyline, pick_spread, pick_total,
        conf_moneyline, conf_spread, conf_total,
        rationale,
        moneyline_home, moneyline_away,
        spread_line, spread_price_home, spread_price_away,
        total_line, total_over_price, total_under_price,
        result_status, season
        `,
        { count: "exact" }
      )
      .eq("sport", "mlb");

    if (typeof season === "number" && !Number.isNaN(season)) {
      query = query.eq("season", season);
    }
    if (date) {
      // match by game_date or commence_time day (whichever you store consistently)
      query = query.eq("game_date", date);
    }
    if (team && team.trim().length > 0) {
      const t = `%${team.trim()}%`;
      query = query.or(`home_team.ilike.${t},away_team.ilike.${t}`);
    }

    query = query.order("commence_time", { ascending: true }).range(from, to);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      data,
      meta: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
