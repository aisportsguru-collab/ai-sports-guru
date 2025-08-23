import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED = new Set(["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing Supabase envs" });
  }

  const league = String(req.query.league || "").toLowerCase();
  if (!ALLOWED.has(league)) return res.status(400).json({ error: "Invalid league" });

  const season = (req.query.season as string) || String(new Date().getFullYear());

  try {
    // Probe one row to see what columns the view actually has
    const probe = await supabase.from("v_predictions_api").select("*").limit(1).maybeSingle();
    if (probe.error && probe.error.code !== "PGRST116") { // ignore "Results contain 0 rows" style
      return res.status(500).json({ error: `supabase probe error: ${probe.error.message}` });
    }

    const cols = Object.keys(probe.data || {});
    const colLeague = cols.includes("league") ? "league" : (cols.includes("sport") ? "sport" : null);
    const colSeason = cols.includes("season") ? "season" :
                      (cols.includes("season_year") ? "season_year" :
                      (cols.includes("year") ? "year" : null));
    const colStart  = cols.includes("start_time") ? "start_time" : null;

    // Build the query only with columns that exist
    let q = supabase.from("v_predictions_api").select("*");
    if (colLeague) q = q.eq(colLeague as any, league);
    if (colSeason) q = q.eq(colSeason as any, season);
    if (colStart)  q = (q as any).order(colStart, { ascending: true });

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: `supabase error: ${error.message}` });

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({ data, usedColumns: { league: colLeague, season: colSeason, orderedBy: colStart } });
  } catch (e: any) {
    return res.status(500).json({ error: `handler error: ${e?.message || String(e)}` });
  }
}
