import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const league = (req.query.league as string || "").toLowerCase();
  if (!league) return res.status(400).json({ error: "league is required" });

  const seasonParam = req.query.season as string | undefined;
  const dateParam = req.query.date as string | undefined;

  try {
    let q = supabaseAdmin
      .from("ai_research_predictions")
      .select([
        "external_id","sport","season","game_date","commence_time",
        "home_team","away_team",
        "moneyline_home","moneyline_away",
        "spread_line","spread_price_home","spread_price_away",
        "total_line","total_over_price","total_under_price",
        "predicted_winner",
        "pick_moneyline","pick_spread","pick_total",
        "conf_moneyline","conf_spread","conf_total",
      ].join(","))
      .eq("sport", league);

    if (seasonParam) {
      const seasonNum = Number(seasonParam);
      if (!Number.isFinite(seasonNum)) return res.status(400).json({ error: "season must be a number" });
      q = q.eq("season", seasonNum);
    }
    if (dateParam) q = q.eq("game_date", dateParam);

    q = q.order("commence_time", { ascending: true });

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    const mapped = (data || []).map((r: any) => {
      const predictedByTeam =
        r.predicted_winner === "home" ? r.home_team :
        r.predicted_winner === "away" ? r.away_team :
        r.predicted_winner;

      return {
        // legacy/compat
        game_id: r.external_id,
        total_points: r.total_line,
        over_odds: r.total_over_price,
        under_odds: r.total_under_price,
        predicted_winner: predictedByTeam,

        // canonical
        external_id: r.external_id,
        sport: r.sport,
        season: r.season,
        game_date: r.game_date,
        commence_time: r.commence_time,
        home_team: r.home_team,
        away_team: r.away_team,
        moneyline_home: r.moneyline_home,
        moneyline_away: r.moneyline_away,
        spread_line: r.spread_line,
        spread_price_home: r.spread_price_home,
        spread_price_away: r.spread_price_away,
        total_line: r.total_line,
        total_over_price: r.total_over_price,
        total_under_price: r.total_under_price,
        pick_moneyline: r.pick_moneyline,
        pick_spread: r.pick_spread,
        pick_total: r.pick_total,
        conf_moneyline: r.conf_moneyline,
        conf_spread: r.conf_spread,
        conf_total: r.conf_total,
      };
    });

    return res.status(200).json({ data: mapped, count: mapped.length });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
