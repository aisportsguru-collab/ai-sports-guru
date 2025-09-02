import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getAdmin();
  // find the most recent stat_date we have
  const { data: latest, error: e1 } = await supabase
    .from("model_metrics_daily")
    .select("stat_date")
    .order("stat_date", { ascending: false })
    .limit(1);
  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
  if (!latest || latest.length === 0)
    return NextResponse.json({ ok: true, items: [] });

  const stat_date = latest[0].stat_date;
  const { data, error } = await supabase
    .from("model_metrics_daily")
    .select("*")
    .eq("stat_date", stat_date)
    .order("league")
    .order("market");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, stat_date, items: data });
}
