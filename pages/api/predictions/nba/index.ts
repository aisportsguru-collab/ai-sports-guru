import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const season = (req.query.season as string) || "2025";

    const { data, error } = await supabase
      .from("nba_predictions")
      .select("*")
      .eq("season", season)
      .order("start_time", { ascending: true });

    if (error) throw error;
    res.status(200).json({ data });
  } catch (err) {
    console.error("NBA Predictions error:", err);
    res.status(500).json({ error: "Failed to fetch NBA predictions" });
  }
}
