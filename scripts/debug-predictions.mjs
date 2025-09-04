import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const res = await sb.from("predictions").select("*").limit(3);
if (res.error) { console.error(res.error); process.exit(1); }
for (const row of res.data || []) {
  console.log(Object.keys(row));
  break;
}
console.log("sample:", (res.data||[])[0]);
