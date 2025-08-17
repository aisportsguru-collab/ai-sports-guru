import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type LeagueId = 'nfl'|'nba'|'mlb'|'nhl'|'ncaa_football'|'ncaa_basketball';
type SlimGame = {
  league: LeagueId;
  homeTeam: string;
  awayTeam: string;
  kickoffISO?: string;
  odds?: {
    moneyline?: { home?: number; away?: number; draw?: number; book?: string };
    spread?:    { line?: number; home?: number; away?: number; book?: string };
    total?:     { line?: number; over?: number; under?: number; book?: string };
  };
};
type Store = {
  updatedAt: string;
  items: Record<string, SlimGame & { firstSeenAt: string; lastSeenAt: string }>;
};
const DATA_DIR  = path.join(process.cwd(), '.data', 'ingest');
const DATA_FILE = path.join(DATA_DIR, 'games.json');

function hashKey(g: SlimGame) {
  const day = (g.kickoffISO || '').slice(0, 10);
  const key = `${g.league}|${day}|${g.homeTeam.trim().toLowerCase()}|${g.awayTeam.trim().toLowerCase()}`;
  return createHash('sha1').update(key).digest('hex');
}
async function loadStore(): Promise<Store> {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as Store; }
  catch { return { updatedAt: new Date().toISOString(), items: {} }; }
}
async function saveStore(s: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(s, null, 2));
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }); }
  const items = (req.body?.items ?? []) as SlimGame[];
  if (!Array.isArray(items) || !items.length) return res.status(200).json({ ok:true, upserts:0 });

  const store = await loadStore();
  let upserts = 0;
  for (const g of items) {
    const id = hashKey(g);
    const existing = store.items[id];
    if (existing) store.items[id] = { ...existing, ...g, lastSeenAt: new Date().toISOString() };
    else { store.items[id] = { ...g, firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() }; upserts++; }
  }
  store.updatedAt = new Date().toISOString();
  await saveStore(store);
  return res.status(200).json({ ok:true, upserts });
}
