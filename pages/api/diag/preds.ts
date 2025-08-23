import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing Supabase envs" });
  }
  try {
    const leaguesRes = await supabase.from("v_predictions_api").select("league").limit(1000);
    if (leaguesRes.error) return res.status(500).json({ error: `supabase error: ${leaguesRes.error.message}` });

    const leagues = Array.from(new Set((leaguesRes.data ?? []).map((r: any) => String(r.league || "").toLowerCase()))).sort();

    let sample: any = null;
    if (leagues.length) {
      const first = leagues[0];
      const sampleRes = await supabase
        .from("v_predictions_api")
        .select("*")
        .eq("league", first)
        .limit(1)
        .maybeSingle();
      sample = sampleRes.error ? { error: sampleRes.error.message } : (sampleRes.data || null);
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, leagues, sample });
  } catch (e: any) {
    return res.status(500).json({ error: `handler error: ${e?.message || String(e)}` });
  }
}
