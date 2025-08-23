import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, PostgrestError } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const ALLOWED = new Set(["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"]);

// Try selecting with a key; if 42703 (undefined column), we know the column doesn't exist.
async function trySelect(opts: {
  league: string;
  season?: string | null;
  columnForLeague: "league" | "sport";
  seasonColumn?: string | null; // e.g. "season" if it exists
  fromISO?: string;
  toISO?: string;
}) {
  const { league, season, columnForLeague, seasonColumn, fromISO, toISO } = opts;

  let q = supabase
    .from("v_predictions_api")
    .select("*")
    .eq(columnForLeague, league)
    .order("commence_time", { ascending: true });

  if (season && seasonColumn) {
    q = q.eq(seasonColumn, season);
  } else if (fromISO && toISO) {
    q = q.gte("commence_time", fromISO).lt("commence_time", toISO);
  }

  const { data, error } = await q;
  return { data, error };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing Supabase envs" });
  }

  const league = String(req.query.league || "").toLowerCase();
  if (!ALLOWED.has(league)) return res.status(400).json({ error: "Invalid league" });

  const season = (req.query.season as string) || String(new Date().getFullYear());

  // Build a date window for the whole season year as a fallback (UTC boundaries)
  const fromISO = `${season}-01-01T00:00:00.000Z`;
  const toISO   = `${String(Number(season) + 1)}-01-01T00:00:00.000Z`;

  try {
    // 1) league column may actually be "sport"
    let colForLeague: "league" | "sport" = "league";
    let r = await trySelect({ league, season, columnForLeague: colForLeague, seasonColumn: "season", fromISO, toISO });

    // If league column doesn't exist, retry with "sport"
    if ((r.error as PostgrestError | null)?.code === "42703") {
      colForLeague = "sport";
      r = await trySelect({ league, season, columnForLeague: colForLeague, seasonColumn: "season", fromISO, toISO });
    }

    // If season column doesn't exist, retry without season eq and use date window
    if ((r.error as PostgrestError | null)?.code === "42703") {
      r = await trySelect({ league, season, columnForLeague: colForLeague, seasonColumn: null, fromISO, toISO });
    }

    if (r.error) {
      return res.status(500).json({ error: `supabase error: ${r.error.message}` });
    }

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({
      usedColumns: {
        league: colForLeague,
        season: r.error ? null : "auto",
        dateRange: { fromISO, toISO }
      },
      data: r.data
    });
  } catch (e: any) {
    return res.status(500).json({ error: `handler error: ${e?.message || String(e)}` });
  }
}
