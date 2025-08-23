import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const ALLOWED = new Set(["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing Supabase envs" });
  }

  const league = String(req.query.league || "").toLowerCase();
  if (!ALLOWED.has(league)) return res.status(400).json({ error: "Invalid league" });

  const season = (req.query.season as string) || String(new Date().getFullYear());

  try {
    const { data, error } = await supabase
      .from("v_predictions_api")
      .select("*")
      .eq("league", league)
      .eq("season", season)
      .order("start_time", { ascending: true });

    if (error) return res.status(500).json({ error: `supabase error: ${error.message}` });

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: `handler error: ${e?.message || String(e)}` });
  }
}
