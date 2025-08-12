export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const result = checkAdmin(req);
  if (!result.ok) {
    return NextResponse.json({ ok: false, ...result }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    ...result,
    runtime: "nodejs",
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
