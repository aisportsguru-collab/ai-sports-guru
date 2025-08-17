import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type ScoreItem = { league:string; homeTeam:string; awayTeam:string; kickoffISO?:string; homeScore:number; awayScore:number; final?:boolean; };
type Store = { updatedAt:string; items: Record<string, ScoreItem & { firstSeenAt:string; lastSeenAt:string }>; };

const DATA_DIR  = path.join(process.cwd(), '.data', 'scores');
const DATA_FILE = path.join(DATA_DIR, 'scores.json');

function keyOf(x: ScoreItem) {
  const d = (x.kickoffISO || '').slice(0,10);
  const raw = `${x.league}|${d}|${x.homeTeam.trim().toLowerCase()}|${x.awayTeam.trim().toLowerCase()}`;
  return createHash('sha1').update(raw).digest('hex');
}
async function load(): Promise<Store> { try { return JSON.parse(await fs.readFile(DATA_FILE,'utf8')) as Store; } catch { return { updatedAt:new Date().toISOString(), items:{} }; } }
async function save(s: Store) { await fs.mkdir(DATA_DIR,{recursive:true}); await fs.writeFile(DATA_FILE, JSON.stringify(s,null,2)); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false, error:'Method Not Allowed' }); }
  const items = (req.body?.items ?? []) as ScoreItem[];
  if (!Array.isArray(items) || !items.length) return res.status(200).json({ ok:true, upserts:0 });

  const store = await load();
  let upserts = 0;
  for (const it of items) {
    const id = keyOf(it);
    const prev = store.items[id];
    if (prev) store.items[id] = { ...prev, ...it, lastSeenAt:new Date().toISOString() };
    else { store.items[id] = { ...it, firstSeenAt:new Date().toISOString(), lastSeenAt:new Date().toISOString() }; upserts++; }
  }
  store.updatedAt = new Date().toISOString();
  await save(store);
  return res.status(200).json({ ok:true, upserts });
}
