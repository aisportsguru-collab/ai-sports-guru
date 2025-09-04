export const dash = "—";

export function fmtMoneyline(v?: number | string | null) {
  if (v === undefined || v === null || v === "") return dash;
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return String(v);
  return (n > 0 ? `+${n}` : `${n}`);
}

export function fmtSpread(v?: number | string | null) {
  if (v === undefined || v === null || v === "") return dash;
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return String(v);
  return n > 0 ? `+${n}` : `${n}`;
}

export function fmtPercent(v?: number | null) {
  if (v === undefined || v === null) return dash;
  return `${(v * 100).toFixed(1)}%`;
}

export function fmtTimeUTCString(iso?: string | null) {
  if (!iso) return dash;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toLocaleString(); // local timezone display
}
