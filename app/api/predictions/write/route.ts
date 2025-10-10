import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Accepts an array of rows and upserts into predictions_base.
 * Dedupe key: (game_id, model_version, pick_type)
 * NOTE: No `.select()` (no RETURNING) -> fast + safe.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const rows: any[] = Array.isArray(body) ? body : body?.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { error } = await sb
      .from("predictions_base")
      .upsert(rows, { onConflict: "game_id,model_version,pick_type" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // With no .select(), Supabase returns data: null — just report what we attempted.
    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
