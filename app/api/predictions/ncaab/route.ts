export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season") ?? `${new Date().getFullYear()}`;

    const { data, error } = await supabase
      .from("v_predictions_api")
      .select("*")
      .eq("league", "ncaab")
      .eq("season", season)
      .order("start_time", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("NCAAB Predictions error:", err);
    return NextResponse.json({ error: "Failed to fetch NCAAB predictions" }, { status: 500 });
  }
}