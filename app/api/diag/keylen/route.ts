export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

function mask(v?: string | null) {
  if (!v) return { present: false, len: 0, head: "", tail: "" };
  const len = v.length;
  const head = v.slice(0, 6);
  const tail = v.slice(-6);
  return { present: true, len, head, tail };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: mask(url),
    SUPABASE_SERVICE_ROLE_KEY: mask(srk),
  });
}
