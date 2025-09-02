import { NextResponse } from "next/server";
import { supabaseAnon, supabaseAdmin, getSupabaseUrl, getAnonKey, getServiceRoleKey, decodeJwtPayload } from "@/lib/supabaseServer";

export async function GET() {
  const url = getSupabaseUrl();
  const anon = getAnonKey();
  const svc  = getServiceRoleKey();

  const urlRef = url ? url.replace(/^https:\/\/([^.]+)\..+$/, "$1") : null;

  const anonPayload = anon ? decodeJwtPayload(anon) : null;
  const svcPayload  = svc  ? decodeJwtPayload(svc)  : null;

  const results: any = {
    env: {
      SUPABASE_URL: url || null,
      SUPABASE_ANON_KEY: anon ? (anon.slice(0,10)+"..."+anon.slice(-6)) : null,
      SUPABASE_SERVICE_ROLE: svc ? (svc.slice(0,10)+"..."+svc.slice(-6)) : null,
    },
    decoded: {
      url_ref: urlRef,
      anon: anonPayload ? { ref: anonPayload.ref, role: anonPayload.role, iss: anonPayload.iss, iat: anonPayload.iat, exp: anonPayload.exp } : null,
      service: svcPayload ? { ref: svcPayload.ref, role: svcPayload.role, iss: svcPayload.iss, iat: svcPayload.iat, exp: svcPayload.exp } : null,
      warnings: [] as string[],
    },
    checks: {} as any,
  };

  // Cross-check refs/roles
  if (anonPayload?.ref && urlRef && anonPayload.ref !== urlRef) {
    results.decoded.warnings.push(`Anon key ref mismatch (anon.ref=${anonPayload.ref} vs url.ref=${urlRef})`);
  }
  if (svcPayload?.ref && urlRef && svcPayload.ref !== urlRef) {
    results.decoded.warnings.push(`Service key ref mismatch (service.ref=${svcPayload.ref} vs url.ref=${urlRef})`);
  }
  if (anonPayload?.role && anonPayload.role !== "anon") {
    results.decoded.warnings.push(`Anon key role is not "anon" (got: ${anonPayload.role})`);
  }
  if (svcPayload?.role && svcPayload.role !== "service_role") {
    results.decoded.warnings.push(`Service key role is not "service_role" (got: ${svcPayload.role})`);
  }

  // Try anon read
  try {
    const anonClient = supabaseAnon();
    const { data, error } = await anonClient.from("games").select("id").limit(1);
    results.checks.anon_select_games = { ok: !error, error: error?.message, rowCount: data?.length ?? 0 };
  } catch (e: any) {
    results.checks.anon_select_games = { ok: false, error: e?.message || String(e) };
  }

  // Try admin read
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("games").select("id").limit(1);
    results.checks.admin_select_games = { ok: !error, error: error?.message, rowCount: data?.length ?? 0 };
  } catch (e: any) {
    results.checks.admin_select_games = { ok: false, error: e?.message || String(e) };
  }

  // Try admin read on a view as well
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("v_predictions_ui").select("game_id").limit(1);
    results.checks.admin_select_view = { ok: !error, error: error?.message, rowCount: data?.length ?? 0 };
  } catch (e: any) {
    results.checks.admin_select_view = { ok: false, error: e?.message || String(e) };
  }

  return NextResponse.json(results);
}
