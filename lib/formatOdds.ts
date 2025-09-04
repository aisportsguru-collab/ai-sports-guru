export function american(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Math.round(Number(v));
  if (n === 0) return "EVEN";
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatSpreadWithTeam(
  homeTeam: string,
  awayTeam: string,
  spread_line: number | null | undefined
): string {
  if (spread_line == null || !Number.isFinite(Number(spread_line))) return "—";
  const n = Number(spread_line);
  const pts = Math.abs(n).toFixed(Math.abs(n) % 1 ? 2 : 0);
  const team = n <= 0 ? homeTeam : awayTeam;
  const sign = n <= 0 ? "-" : "+";
  return `${team} ${sign}${pts}`;
}

export function formatTotals(total_points: number | null | undefined, over: number | null | undefined, under: number | null | undefined): string {
  if (total_points == null || !Number.isFinite(Number(total_points))) return "— / —";
  const t = Number(total_points);
  return `Over ${t} ${american(over)}  /  Under ${t} ${american(under)}`;
}
