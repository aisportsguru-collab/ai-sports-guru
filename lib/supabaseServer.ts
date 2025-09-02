// lib/supabaseServer.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getEnvTrim(k: string) {
  const v = process.env[k];
  return typeof v === "string" ? v.trim() : v;
}

const SUPABASE_URL =
  getEnvTrim("NEXT_PUBLIC_SUPABASE_URL") || getEnvTrim("SUPABASE_URL");

const SUPABASE_ANON_KEY =
  getEnvTrim("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnvTrim("SUPABASE_ANON_KEY");

const SUPABASE_SERVICE_ROLE =
  getEnvTrim("SUPABASE_SERVICE_ROLE") ||
  getEnvTrim("SUPABASE_SERVICE_ROLE_KEY") ||
  getEnvTrim("SR");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Public (RLS) client
export const supabaseAnon: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Admin client using apikey=ANON + Authorization=SERVICE_ROLE
export const supabaseAdmin: SupabaseClient = (() => {
  if (!SUPABASE_SERVICE_ROLE) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_ROLE_KEY / SR");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      },
    },
  });
})();
