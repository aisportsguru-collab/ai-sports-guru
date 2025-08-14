import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, first_name = null, last_name = null, phone = null } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await supabase.from("profiles").upsert(
      {
        id,
        email: email || null,
        first_name,
        last_name,
        phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
