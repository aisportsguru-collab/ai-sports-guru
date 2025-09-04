import { getSupabaseUrl, getServiceRoleKey, getAnonKey } from "@/lib/env";

export type RestCtx = { url: string; key: string };

/** Creates a fetch init with proper headers for Supabase REST. */
export function supaInit(ctx?: Partial<RestCtx>): { base: string; init: RequestInit } {
  const base = (ctx?.url || getSupabaseUrl() || "").replace(/\/+$/,"");
  const key  = (ctx?.key || getServiceRoleKey() || getAnonKey() || "").trim();
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (key) { headers["apikey"] = key; headers["Authorization"] = `Bearer ${key}`; }
  return { base, init: { headers, cache: "no-store" as const } };
}

export async function restSelect<T=any>(path: string, ctx?: Partial<RestCtx>): Promise<T[]> {
  const { base, init } = supaInit(ctx);
  if (!base) return [];
  try {
    const r = await fetch(`${base}/rest/v1/${path}`, init);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}
