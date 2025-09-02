import { NextResponse } from "next/server";

async function hit(url: string, apikey: string, bearer: string) {
  const res = await fetch(`${url}/rest/v1/games?select=id&limit=1`, {
    headers: {
      apikey,
      Authorization: `Bearer ${bearer}`,
      accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text().catch(() => "");
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

export async function GET() {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anon  = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const svc   = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !anon || !svc) {
    return NextResponse.json({
      ok: false,
      reason: "missing_env",
      have: {
        url: !!url, anon_len: anon.length, service_len: svc.length,
      }
    }, { status: 500 });
  }

  // 4 patterns to definitively test your gateway behavior
  const patterns = [
    { name: "A_service_service", apikey: svc, bearer: svc },
    { name: "B_anon_anon",       apikey: anon, bearer: anon },
    { name: "C_anon_service",    apikey: anon, bearer: svc },
    { name: "D_service_anon",    apikey: svc, bearer: anon },
  ];

  const results: any = {};
  for (const p of patterns) {
    try {
      results[p.name] = await hit(url, p.apikey, p.bearer);
    } catch (e: any) {
      results[p.name] = { status: 0, error: e?.message || String(e) };
    }
  }

  return NextResponse.json({
    url,
    lengths: { anon: anon.length, service: svc.length },
    results,
    hint: "For admin/server work, use A_service_service. For public reads, use B_anon_anon.",
  });
}
