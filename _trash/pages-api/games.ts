import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), '.data', 'ingest', 'games.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const league = String(req.query.league || '').toLowerCase();
  const date   = String(req.query.date   || '');
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const store = JSON.parse(raw) as { items: Record<string, any> };
    let items = Object.values(store.items || {});
    if (league) items = items.filter((g:any) => (g.league||'').toLowerCase() === league);
    if (date)   items = items.filter((g:any) => (g.kickoffISO||'').slice(0,10) === date);
    return res.status(200).json({ count: items.length, items });
  } catch {
    return res.status(200).json({ count: 0, items: [] });
  }
}
