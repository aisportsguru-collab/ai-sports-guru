import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type LeagueId = 'nfl'|'nba'|'mlb'|'nhl'|'ncaa_football'|'ncaa_basketball';
type SlimGame = {
  league: LeagueId;
  homeTeam: string;
  awayTeam: string;
  kickoffISO?: string; // ISO string
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

function keyOf(g: SlimGame) {
  const day = (g.kickoffISO || '').slice(0,10);
  const raw = `${g.league}|${day}|${g.homeTeam.trim().toLowerCase()}|${g.awayTeam.trim().toLowerCase()}`;
  return createHash('sha1').update(raw).digest('hex');
}
async function load(): Promise<Store> {
  try { return JSON.parse(await fs.readFile(DATA_FILE,'utf8')) as Store; }
  catch { return { updatedAt:new Date().toISOString(), items:{} }; }
}
async function save(s: Store) {
  await fs.mkdir(DATA_DIR, { recursive:true });
  await fs.writeFile(DATA_FILE, JSON.stringify(s, null, 2));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET or POST both seed the same data
  const today = new Date().toISOString().slice(0,10);
  const sample: SlimGame[] = [
    {
      league:'nfl', homeTeam:'Buffalo Bills', awayTeam:'New York Jets',
      kickoffISO: `${today}T17:00:00Z`,
      odds:{
        moneyline:{ home:-160, away:+140, book:'MockBook' },
        spread:{ line:-3.5, home:-110, away:-110, book:'MockBook' },
        total:{ line:46.5, over:-108, under:-112, book:'MockBook' }
      }
    },
    {
      league:'nfl', homeTeam:'Kansas City Chiefs', awayTeam:'Las Vegas Raiders',
      kickoffISO: `${today}T21:25:00Z`,
      odds:{
        moneyline:{ home:-300, away:+245, book:'MockBook' },
        spread:{ line:-6.5, home:-110, away:-110, book:'MockBook' },
        total:{ line:49.5, over:-105, under:-115, book:'MockBook' }
      }
    }
  ];

  const store = await load();
  let upserts = 0;
  for (const g of sample) {
    const id = keyOf(g);
    const prev = store.items[id];
    if (prev) {
      store.items[id] = { ...prev, ...g, lastSeenAt: new Date().toISOString() };
    } else {
      store.items[id] = { ...g, firstSeenAt:new Date().toISOString(), lastSeenAt:new Date().toISOString() };
      upserts++;
    }
  }
  store.updatedAt = new Date().toISOString();
  await save(store);

  return res.status(200).json({ ok:true, upserts, total:Object.keys(store.items).length });
}
