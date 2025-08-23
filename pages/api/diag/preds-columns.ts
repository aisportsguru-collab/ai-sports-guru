import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await supabase.from("v_predictions_api").select("*").limit(1).maybeSingle();
    if (r.error) return res.status(500).json({ error: r.error.message });

    const sample = r.data || {};
    const columns = Object.keys(sample).sort();
    return res.status(200).json({ columns, sample });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
