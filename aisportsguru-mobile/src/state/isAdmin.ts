import { ENV } from "../config/env";

/** Case-insensitive admin check against EXPO_PUBLIC_ADMIN_EMAILS */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = String(email).toLowerCase().trim();
  return ENV.ADMIN_EMAILS.includes(e);
}
