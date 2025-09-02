// Small helper used by route.ts to upsert safely in production.
import { createClient } from '@supabase/supabase-js';

type Row = {
  external_id: string;
  sport: string;
  commence_time: string;  // ISO
  season?: number | null;
  // ... other columns you already set (moneyline_*, spread_*, total_*, picks, etc.)
  [k: string]: any;
};

export async function upsertPredictions(rows: Row[]) {
  const url = process.env.SUPABASE_URL!;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.toString();

  if (!url || !service) {
    return { count: 0, error: 'Supabase env not configured on server (SUPABASE_URL / SUPABASE_SERVICE_ROLE[_KEY]).' };
  }

  // 1) de-duplicate by the same key used in ON CONFLICT
  const uniq = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.external_id}:${r.sport}`;
    // ensure season is present; DB trigger also covers this
    if (r.season == null && r.commence_time) {
      const y = new Date(r.commence_time).getUTCFullYear();
      r.season = Number.isFinite(y) ? y : null;
    }
    uniq.set(key, r);
  }
  const finalRows = Array.from(uniq.values());
  if (finalRows.length === 0) return { count: 0 };

  // 2) fast, reliable upsert
  const supa = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error, count } = await supa
    .from('ai_research_predictions')
    .upsert(finalRows, {
      onConflict: 'external_id,sport',
      ignoreDuplicates: false
    })
    .select('external_id', { count: 'exact', head: true });

  return { count: count ?? 0, error: error?.message || null };
}
