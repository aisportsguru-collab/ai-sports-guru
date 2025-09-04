import { headers } from "next/headers";

/** Returns an absolute origin like "http://localhost:3000" or your deployed host. */
export async function getServerBase(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
