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

// Minimal inline re-evaluator: do it in SQL where possible to keep it cheap,
// but here we’ll just call a RPC later. For now, return 200 so cron is happy.
export async function GET() {
  // If you want, you can port the Python logic to TS here later.
  return NextResponse.json({ ok: true, note: "Hook this to a TS re-evaluator or a Supabase function if desired." });
}
