// app/api/diag/supabase-decode/route.ts
import { NextResponse } from "next/server";

function decodeSegment(seg?: string) {
  if (!seg) return null;
  try {
    const pad = seg.length % 4 === 2 ? "==" : seg.length % 4 === 3 ? "=" : "";
    const json = Buffer.from(seg + pad, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function decodeJwt(jwt?: string) {
  if (!jwt) return null;
  const [h, p] = jwt.split(".");
  return {
    header: decodeSegment(h),
    payload: decodeSegment(p),
    prefix: jwt.slice(0, 16),
    suffix: jwt.slice(-16),
    length: jwt.length,
  };
}

export async function GET() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    null;
  const service =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SR ||
    null;

  const out: any = {
    url,
    ref_from_url: url?.split("//")[1]?.split(".")[0],
    env_present: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SR: !!process.env.SR,
    },
    anon_decoded: decodeJwt(anon || undefined),
    service_decoded: decodeJwt(service || undefined),
    quick_checks: [] as string[],
  };

  if (out.anon_decoded?.payload?.ref && out.ref_from_url) {
    out.quick_checks.push(
      out.anon_decoded.payload.ref === out.ref_from_url
        ? "anon.ref matches URL project ref ✅"
        : `anon.ref MISMATCH: ${out.anon_decoded.payload.ref} vs ${out.ref_from_url} ❌`,
    );
  }
  if (out.service_decoded?.payload?.ref && out.ref_from_url) {
    out.quick_checks.push(
      out.service_decoded.payload.ref === out.ref_from_url
        ? "service.ref matches URL project ref ✅"
        : `service.ref MISMATCH: ${out.service_decoded.payload.ref} vs ${out.ref_from_url} ❌`,
    );
  }
  if (out.service_decoded?.payload?.role) {
    out.quick_checks.push(`service.role=${out.service_decoded.payload.role}`);
  }

  return NextResponse.json(out);
}
