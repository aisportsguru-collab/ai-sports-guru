import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase
      .from("v_table_columns")
      .select("column_name")
      .eq("table_name", "v_predictions_api")
      .order("column_name", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ columns: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
