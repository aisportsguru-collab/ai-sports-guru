import { NextResponse } from "next/server";
import { readAdminHeader, verifyAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const env = (process.env.ADMIN_TOKEN || "").trim();
  const header = readAdminHeader(req);
  const verdict = verifyAdmin(req);

  return NextResponse.json({
    ok: verdict.ok,
    reason: verdict.ok ? null : verdict.reason,
    envLen: env.length,
    headerLen: header.length,
    headerPreview: header ? header.slice(0, 6) + "…" : "",
    // NOTE: no secrets echoed back
  });
}
