// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import type { NormalGame } from './odds';

const DIR  = path.join(process.cwd(), '.data', 'ingest');
const FILE = path.join(DIR, 'games.json');

type Store = { updatedAt: string; items: Record<string, any> };

export async function upsertGames(games: NormalGame[]) {
  await fs.mkdir(DIR, { recursive: true });
  let store: Store = { updatedAt: new Date().toISOString(), items: {} };
  try { store = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch {}
  for (const g of games) {
    store.items[g.id] = { ...(store.items[g.id] || {}), ...g, lastSeenAt: new Date().toISOString() };
    if (!store.items[g.id].firstSeenAt) store.items[g.id].firstSeenAt = new Date().toISOString();
  }
  store.updatedAt = new Date().toISOString();
  await fs.writeFile(FILE, JSON.stringify(store, null, 2));
}
