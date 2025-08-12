import crypto from "crypto";

export type AdminCheck =
  | { ok: true; envLen: number; headerLen: number }
  | { ok: false; reason: string; envLen?: number; headerLen?: number };

/** Pulls token from `x-admin-token` or `Authorization: Bearer <token>` */
export function getIncomingToken(req: Request): string | null {
  const h = req.headers;
  const raw =
    h.get("x-admin-token") ??
    h.get("X-Admin-Token") ??
    h.get("authorization") ??
    h.get("Authorization");
  if (!raw) return null;

  let v = raw.trim();
  if (/^Bearer\s+/i.test(v)) v = v.replace(/^Bearer\s+/i, "").trim();
  return v || null;
}

export function checkAdmin(req: Request): AdminCheck {
  const expected = (process.env.ADMIN_TOKEN || "").trim();
  if (!expected) return { ok: false, reason: "missing ADMIN_TOKEN env" };

  const incoming = getIncomingToken(req);
  if (!incoming) return { ok: false, reason: "missing header" };

  const a = Buffer.from(incoming, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) {
    return {
      ok: false,
      reason: "length mismatch",
      headerLen: a.length,
      envLen: b.length,
    };
  }

  const match = crypto.timingSafeEqual(a, b);
  return match
    ? { ok: true, headerLen: a.length, envLen: b.length }
    : { ok: false, reason: "token mismatch", headerLen: a.length, envLen: b.length };
}