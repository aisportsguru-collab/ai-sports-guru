"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client factory (uses *public* anon key).
 * Components should `import { createClient } from "@/lib/supabaseClient"`
 * and call it to get a client.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabaseClient(url, anon);
}

// default export for ergonomics if someone writes `import createClient from ...`
export default createClient;
