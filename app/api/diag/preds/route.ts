export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET() {
  try {
    const leaguesRes = await supabase
      .from("v_predictions_api")
      .select("league")
      .limit(1000);

    if (leaguesRes.error) {
      return NextResponse.json({ error: `supabase error: ${leaguesRes.error.message}` }, { status: 500 });
    }

    const leagues = Array.from(
      new Set((leaguesRes.data ?? []).map((r: any) => (r.league ?? '').toString().toLowerCase()))
    ).sort();

    let sample: any = null;
    if (leagues.length > 0) {
      const first = leagues[0];
      const sampleRes = await supabase
        .from("v_predictions_api")
        .select("*")
        .eq("league", first)
        .limit(1)
        .maybeSingle();

      if (sampleRes.error) {
        sample = { error: sampleRes.error.message };
      } else {
        sample = sampleRes.data || null;
      }
    }

    return NextResponse.json({ ok: true, leagues, sample });
  } catch (e: any) {
    return NextResponse.json({ error: `handler error: ${e?.message || String(e)}` }, { status: 500 });
  }
}
