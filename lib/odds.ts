import fs from 'fs/promises';
import path from 'path';

const BASE = process.env.ODDS_API_BASE || 'https://api.the-odds-api.com/v4';
const KEY  = process.env.ODDS_API_KEY || '';
const TTL  = Number(process.env.ODDS_TTL || 120);

type LeagueId = 'nfl'|'nba'|'mlb'|'nhl'|'ncaa_football'|'ncaa_basketball';

const SPORT_KEY: Record<LeagueId,string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  mlb: 'baseball_mlb',
  nhl: 'icehockey_nhl',
  ncaa_football: 'americanfootball_ncaaf',
  ncaa_basketball: 'basketball_ncaab',
};

export type NormalGame = {
  id: string;
  league: LeagueId;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  markets: {
    spread?: number;
    total?: number;
    ml?: { home?: number; away?: number };
  };
};

function idFor(league: string, home: string, away: string) {
  const h = home.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const a = away.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return `${league}-${h}-${a}`;
}
function bestPrice(curr: number|undefined, next: number|undefined) {
  if (typeof next !== 'number') return curr;
  if (typeof curr !== 'number') return next;
  // American odds: larger is better for bettor (e.g., -110 < -105 < +120 < +150)
  return Math.max(curr, next);
}

async function readCache(file: string) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const j = JSON.parse(raw);
    if (Date.now() - j.savedAt < TTL*1000) return j.data;
  } catch {}
  return null;
}
async function writeCache(file: string, data: any) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ savedAt: Date.now(), data }));
}

export async function fetchLiveOdds(league: LeagueId, day: string): Promise<NormalGame[]> {
  if (!KEY) throw new Error('Missing ODDS_API_KEY');
  const sport = SPORT_KEY[league];
  if (!sport) return [];

  const cacheFile = path.join(process.cwd(), '.data', 'live', `odds-${league}-${day}.json`);
  const cached = await readCache(cacheFile);
  if (cached) return cached;

  const url = new URL(`${BASE}/sports/${sport}/odds`);
  url.searchParams.set('regions','us');
  url.searchParams.set('markets','h2h,spreads,totals');
  url.searchParams.set('oddsFormat','american');
  url.searchParams.set('dateFormat','iso');
  url.searchParams.set('apiKey', KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Odds API ${res.status}`);
  const events = await res.json();

  const out: NormalGame[] = [];
  for (const e of events) {
    const home = e.home_team as string;
    const away = e.away_team as string;
    const tISO = e.commence_time as string;

    let spread: number|undefined;
    let total: number|undefined;
    let mlHome: number|undefined;
    let mlAway: number|undefined;

    for (const bk of e.bookmakers || []) {
      for (const m of bk.markets || []) {
        const key = m.key as string;
        if (key === 'h2h') {
          for (const o of m.outcomes || []) {
            if (o.name === home) mlHome = bestPrice(mlHome, o.price);
            if (o.name === away) mlAway = bestPrice(mlAway, o.price);
          }
        } else if (key === 'spreads') {
          const ho = (m.outcomes || []).find((o:any) => o.name === home);
          if (ho?.point != null) spread = ho.point;
        } else if (key === 'totals') {
          const over = (m.outcomes || []).find((o:any) => o.name === 'Over');
          if (over?.point != null) total = over.point;
        }
      }
    }

    out.push({
      id: idFor(league, home, away),
      league,
      homeTeam: home,
      awayTeam: away,
      kickoffISO: tISO,
      markets: { spread, total, ml: { home: mlHome, away: mlAway } },
    });
  }

  await writeCache(cacheFile, out);
  return out;
}
