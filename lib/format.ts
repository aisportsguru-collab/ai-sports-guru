export function american(x: number | null | undefined): string {
  if (x === null || x === undefined) return '—';
  const n = Number(x);
  if (!Number.isFinite(n)) return '—';
  return n > 0 ? `+${n}` : `${n}`;
}

export type PickSide = 'HOME' | 'AWAY' | 'OVER' | 'UNDER' | null | undefined;

export function pickSideToTeam(side: PickSide, home: string, away: string): string {
  if (side === 'HOME') return home;
  if (side === 'AWAY') return away;
  return '—';
}

export function formatSpreadWithTeam(
  side: PickSide,
  spreadLine: number | null | undefined,
  home: string,
  away: string
): string {
  if (spreadLine === null || spreadLine === undefined || !Number.isFinite(spreadLine)) return '—';
  const team = side === 'HOME' ? home : side === 'AWAY' ? away : '—';
  const sign = spreadLine > 0 ? '+' : '';
  return team === '—' ? '—' : `${team} ${sign}${spreadLine}`;
}

export function formatTotals(
  totalPoints: number | null | undefined,
  over: number | null | undefined,
  under: number | null | undefined
): string {
  if (totalPoints === null || totalPoints === undefined) return '—';
  return `${totalPoints} (O ${american(over)}, U ${american(under)})`;
}
