import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing Supabase env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("=== information_schema.columns for public.games ===");
  const cols = await sb
    .from("information_schema.columns")
    .select("column_name, data_type")
    .eq("table_schema", "public")
    .eq("table_name", "games")
    .order("column_name");
  console.log(cols.data || cols.error);

  console.log("\n=== latest 5 rows from public.games ===");
  const g = await sb
    .from("games")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5);
  console.log(g.data || g.error);

  console.log("\n=== information_schema.columns for public.odds ===");
  const ocols = await sb
    .from("information_schema.columns")
    .select("column_name, data_type")
    .eq("table_schema", "public")
    .eq("table_name", "odds")
    .order("column_name");
  console.log(ocols.data || ocols.error);

  console.log("\n=== latest 5 rows from public.odds ===");
  const o = await sb
    .from("odds")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5);
  console.log(o.data || o.error);

  // Quick counts by the likely league columns
  console.log("\n=== counts by possible league columns ===");
  for (const col of ["league","sport"]) {
    const r = await sb.rpc("exec", { // fallback if you have a postgres function named exec, else skip
      query: `select '${col}' as col, count(*) as c from public.games where ${col} is not null`
    }).catch(()=>null);
    if (r && r.data) console.log(r.data);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
