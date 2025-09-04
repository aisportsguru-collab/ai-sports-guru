export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

export function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

export function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_ROLE
      || "";
}

export function getOddsApiKey() {
  // Use server var if present, otherwise NEXT_PUBLIC one
  return process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || "";
}

export function isProd() {
  return process.env.NODE_ENV === "production";
}
