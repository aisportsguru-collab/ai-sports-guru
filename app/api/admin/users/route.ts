import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: server-side admin check
async function requireAdmin() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) return { ok: false, userId: null };

  const { data: me } = await admin
    .from("profiles")
    .select("id, is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return { ok: !!me?.is_admin, userId: data.user.id };
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name, phone, subscription_status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data || [] });
}
