import { NextResponse } from "next/server";
export const runtime = "nodejs";

function norm(s: string | null | undefined) {
  return (s ?? "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^['"]|['"]$/g, ""); // strip accidental quotes
}

export async function GET(req: Request) {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const adminRaw = process.env.PREDICTIONS_ADMIN_TOKEN || "";
  const admin = norm(adminRaw);

  // If you pass a header, we’ll report its length too (no value).
  const h1 = norm(req.headers.get("x-admin-token"));
  const h2 = norm(req.headers.get("authorization"));

  return NextResponse.json({
    ok: true,
    supabase: {
      hasUrl: !!url,
      urlLooksRight: url.startsWith("https://") && url.includes(".supabase.co"),
      hasKey: !!key,
      keyLength: key.length,
    },
    adminToken: {
      exists: !!admin,
      length: admin.length,
      // whether the provided header (if any) matches length (not the value)
      headerLen_x_admin_token: h1 ? h1.length : 0,
      headerLen_authorization: h2 ? h2.length : 0,
    },
    runtime: "nodejs",
    vercelEnv: process.env.VERCEL_ENV,
  });
}
