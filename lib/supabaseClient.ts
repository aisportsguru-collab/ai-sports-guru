"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared browser client using the public anon key.
 * Compatible with both:
 *   import { supabase } from "@/lib/supabaseClient"
 *   import { createClient } from "@/lib/supabaseClient"
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase: SupabaseClient = createSupabaseClient(url, anon);

export function createClient(): SupabaseClient {
  // Returns the shared instance; keeps existing call sites working.
  return supabase;
}

// default export kept for ergonomics if any file uses default import
export default createClient;
