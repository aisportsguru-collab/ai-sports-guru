import { NextResponse } from "next/server";
import { getSupabaseUrl, getAnonKey, getServiceRoleKey } from "@/lib/env";

type TryResult = { mode: string; status: number; ok: boolean; body?: any };

async function tryFetch(url: string, apikey?: string, bearer?: string): Promise<TryResult> {
  const mode = `${apikey === bearer ? (apikey ? "sr/sr" : "none/none") : (apikey && bearer ? "anon/sr" : (apikey ? "anon/none" : "none/sr"))}`;
  try {
    const res = await fetch(url, {
      headers: {
        ...(apikey ? { apikey } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      cache: "no-store",
    });
    const ct = res.headers.get("content-type") || "";
    let body: any;
    if (ct.includes("application/json")) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text().catch(() => null);
    }
    return { mode, status: res.status, ok: res.ok, body };
  } catch (e: any) {
    return { mode, status: 0, ok: false, body: String(e?.message || e) };
  }
}

export async function GET() {
  const url = getSupabaseUrl();
  const anon = (() => { try { return getAnonKey(); } catch { return undefined; } })();
  const sr = getServiceRoleKey();

  // lengths only, never secrets
  const meta = {
    url,
    anon_len: anon?.length ?? 0,
    sr_len: sr?.length ?? 0,
    anon_prefix: anon ? anon.slice(0, 12) : "",
    sr_prefix: sr ? sr.slice(0, 12) : "",
  };

  // 1) Auth service sanity
  const authSettings = await tryFetch(`${url}/auth/v1/settings`, anon ?? sr, anon ?? sr);

  // 2) PostgREST – root and info schema attempt
  const restRoot_anon_anon = await tryFetch(`${url}/rest/v1/`, anon, anon);
  const restRoot_anon_sr   = await tryFetch(`${url}/rest/v1/`, anon, sr);
  const restRoot_sr_sr     = await tryFetch(`${url}/rest/v1/`, sr, sr);

  // Tiny table probe (adjust table as needed)
  const probeTable = "nfl_teams";
  const probeUrl = `${url}/rest/v1/${probeTable}?select=team_id,team_name&limit=1`;
  const probe_anon_anon = await tryFetch(probeUrl, anon, anon);
  const probe_anon_sr   = await tryFetch(probeUrl, anon, sr);
  const probe_sr_sr     = await tryFetch(probeUrl, sr, sr);

  return NextResponse.json({
    meta,
    authSettings,
    restRoot: { restRoot_anon_anon, restRoot_anon_sr, restRoot_sr_sr },
    probe: { table: probeTable, probe_anon_anon, probe_anon_sr, probe_sr_sr },
  }, { status: 200 });
}
