import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL)");
if (!SERVICE)      throw new Error("Missing SUPABASE_SERVICE_ROLE(_KEY)");

/**
 * IMPORTANT:
 * - Use the service key as the client key (constructor 2nd arg).
 * - Do NOT override auth headers manually; supabase-js sets the correct
 *   `apikey` AND `Authorization: Bearer` headers to the same token.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
