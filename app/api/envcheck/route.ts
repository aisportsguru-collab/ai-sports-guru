import { NextResponse } from "next/server";

// Force dynamic so it always executes on server
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function peek(name: string) {
  const v = process.env[name as keyof NodeJS.ProcessEnv];
  return { present: !!v, length: typeof v === "string" ? v.length : 0 };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    node: process.version,
    env: {
      SUPABASE_URL: peek("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE: peek("SUPABASE_SERVICE_ROLE"),
      SUPABASE_ANON_KEY: peek("SUPABASE_ANON_KEY"),
      ODDS_API_KEY: peek("ODDS_API_KEY"),
      ODDS_API_REGION: peek("ODDS_API_REGION"),
      ODDS_API_MARKETS: peek("ODDS_API_MARKETS"),
      NEXT_PUBLIC_SUPABASE_URL: peek("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: peek("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
  });
}
