export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: hasUrl ? "present" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: hasKey ? "present" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || "unknown",
    }
  });
}
