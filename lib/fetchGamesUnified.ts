export async function fetchGamesUnified(league: string, daysFrom = 7) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/games?league=${encodeURIComponent(league)}&daysFrom=${daysFrom}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) throw new Error(`API /api/games failed ${res.status}`);
  const json = await res.json();
  return json.data as any[];
}
