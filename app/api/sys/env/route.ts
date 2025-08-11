import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return NextResponse.json({
    ok: true,
    hasUrl: !!url,
    urlLooksRight: url.startsWith("https://") && url.includes(".supabase.co"),
    hasKey: !!key,
    keyLength: key.length,
    runtime: "nodejs",
    vercelEnv: process.env.VERCEL_ENV,
  });
}
