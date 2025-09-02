/**
 * EV + implied-probability helpers
 */

// American odds -> implied prob (WITH vig)
export function impliedFromAmerican(odds: number | null | undefined): number | null {
  if (odds == null) return null;
  if (odds > 0) return 100 / (odds + 100);
  return (-odds) / ((-odds) + 100);
}

// Two-way normalization to remove vig
export function normalizeTwoWay(pA: number | null, pB: number | null): [number | null, number | null] {
  if (pA == null || pB == null) return [pA, pB];
  const z = pA + pB;
  if (!isFinite(z) || z <= 0) return [pA, pB];
  return [pA / z, pB / z];
}

export function pickFromProb(pHome: number): "HOME" | "AWAY" {
  return pHome >= 0.5 ? "HOME" : "AWAY";
}

export function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

// Expected value (difference between our prob and book implied)
export function edgePct(ourProb: number | null, bookProb: number | null): number | null {
  if (ourProb == null || bookProb == null) return null;
  return ourProb - bookProb; // e.g. +0.07 => +7% edge
}

export function toPct(x: number | null | undefined): number | null {
  if (x == null) return null;
  return Math.round(100 * x);
}
