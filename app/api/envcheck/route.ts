import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime so process.env behaves consistently

function peek(name: string) {
  const v = process.env[name];
  return { present: !!v, length: typeof v === "string" ? v.length : 0 };
}

export async function GET() {
  const s1 = process.env.SUPABASE_SERVICE_ROLE;
  const s2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const chosen = s1 ?? s2;

  return NextResponse.json({
    ok: true,
    node: process.version,
    env: {
      SUPABASE_URL: peek("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE: peek("SUPABASE_SERVICE_ROLE"),
      SUPABASE_SERVICE_ROLE_KEY: peek("SUPABASE_SERVICE_ROLE_KEY"),
      USING_SERVICE_ROLE_NAME: s1 ? "SUPABASE_SERVICE_ROLE" : (s2 ? "SUPABASE_SERVICE_ROLE_KEY" : null),
      USING_SERVICE_ROLE_PRESENT: !!chosen,
      SUPABASE_ANON_KEY: peek("SUPABASE_ANON_KEY"),
      ODDS_API_KEY: peek("ODDS_API_KEY"),
      ODDS_API_REGION: peek("ODDS_API_REGION"),
      ODDS_API_MARKETS: peek("ODDS_API_MARKETS"),
      NEXT_PUBLIC_SUPABASE_URL: peek("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: peek("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
  });
}
