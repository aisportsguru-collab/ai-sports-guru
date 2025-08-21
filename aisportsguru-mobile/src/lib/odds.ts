/**
 * Helpers to normalize odds coming from different books/shapes.
 * We try several common keys and fall back gracefully.
 */

export type MaybeNum = number | string | null | undefined;

const toNum = (v: MaybeNum): number | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

// Read a spread/total line value: -3.5, 46.5, etc.
export const readLine = (obj: any): number | undefined => {
  if (!obj) return undefined;
  // Common keys across feeds
  return (
    toNum(obj.line) ??
    toNum(obj.points) ??
    toNum(obj.point) ??
    toNum(obj.handicap) ??
    (Array.isArray(obj) ? toNum(obj[0]) : undefined)
  );
};

// Read an American price: -110, +150, etc. (or convert-ish if only decimal)
export const readAmerican = (obj: any): number | undefined => {
  if (!obj) return undefined;

  const first =
    toNum(obj.price) ??
    toNum(obj.american) ??
    toNum(obj.us) ??
    (obj.odds && (toNum(obj.odds.american) ?? toNum(obj.odds.us))) ??
    (Array.isArray(obj) ? toNum(obj[1]) : undefined);

  if (first !== undefined) return first;

  // Try decimal conversion if provided
  const dec =
    toNum(obj.decimal) ??
    (obj.odds && toNum(obj.odds.decimal)) ??
    toNum(obj.dec);
  if (dec && dec > 1) {
    // crude decimal->american conversion
    const am = dec >= 2 ? (dec - 1) * 100 : -100 / (dec - 1);
    return Math.round(am);
  }

  return undefined;
};

export const fmtML = (n?: number) => {
  if (n === undefined) return "—";
  return n > 0 ? `+${n}` : `${n}`;
};

export const fmtSpread = (n?: number) => {
  if (n === undefined) return "—";
  // Consistent +/- sign, keep .5 etc.
  return n > 0 ? `+${n}` : `${n}`;
};

export const fmtTotal = (n?: number) => {
  if (n === undefined) return "—";
  return `${n}`;
};

// Prediction confidence (accepts 0–1, 0–100, or missing)
export const readConfidencePct = (obj: any): number | undefined => {
  if (!obj) return undefined;
  let c =
    toNum(obj.confidencePct) ??
    toNum(obj.confidence) ??
    toNum(obj.probability);

  if (c === undefined) return undefined;
  if (c <= 1) c = c * 100;
  c = Math.round(c);

  // Clamp to 51–100 if present at all
  if (c > 0 && c < 51) c = 51;
  if (c > 100) c = 100;
  return c;
};

export const pickLabel = (p?: string) => {
  if (!p) return "—";
  // Normalize casing
  const s = String(p).toUpperCase();
  if (s.startsWith("H")) return "HOME";
  if (s.startsWith("A")) return "AWAY";
  if (s.startsWith("O")) return "OVER";
  if (s.startsWith("U")) return "UNDER";
  return s;
};
