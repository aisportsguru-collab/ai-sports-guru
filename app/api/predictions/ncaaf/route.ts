export const runtime = 'nodejs';
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
      .eq("league", "ncaaf")
      .eq("season", season);

    if (error) {
      return NextResponse.json({ error: `supabase error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: `handler error: ${err?.message || String(err)}` }, { status: 500 });
  }
}
