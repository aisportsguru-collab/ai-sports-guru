const BASE = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/+$/,'') || '';
export async function getPredictions(sport: string, daysFrom: number) {
  const url = `${BASE}/api/predictions/${sport}?daysFrom=${daysFrom}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }});
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
