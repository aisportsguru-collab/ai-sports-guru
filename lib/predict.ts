import type { NormalGame } from './odds';

export type PickRow = {
  league: NormalGame['league'];
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  market: 'SPREAD' | 'ML' | 'TOTAL';
  pick: 'HOME' | 'AWAY' | 'OVER' | 'UNDER';
  line?: number;
  edgePct?: number;
};

function fallback(g: NormalGame): PickRow[] {
  const out: PickRow[] = [];
  const m = g.markets || {};
  // SPREAD: pick favorite (home if spread < 0)
  if (typeof m.spread === 'number') {
    out.push({
      league: g.league, homeTeam: g.homeTeam, awayTeam: g.awayTeam, kickoffISO: g.kickoffISO,
      market: 'SPREAD', pick: (m.spread <= 0) ? 'HOME' : 'AWAY', line: m.spread, edgePct: 2
    });
  }
  // ML: pick side with better (more negative) implied probability
  const mlh = m.ml?.home, mla = m.ml?.away;
  if (typeof mlh === 'number' || typeof mla === 'number') {
    const homeFav = (typeof mlh === 'number' && typeof mla === 'number') ? (mlh < mla) : (typeof mlh === 'number');
    out.push({
      league: g.league, homeTeam: g.homeTeam, awayTeam: g.awayTeam, kickoffISO: g.kickoffISO,
      market: 'ML', pick: homeFav ? 'HOME' : 'AWAY', edgePct: 5
    });
  }
  // TOTAL: coarse rule
  if (typeof m.total === 'number') {
    out.push({
      league: g.league, homeTeam: g.homeTeam, awayTeam: g.awayTeam, kickoffISO: g.kickoffISO,
      market: 'TOTAL', pick: m.total >= 48 ? 'UNDER' : 'OVER', line: m.total, edgePct: 3
    });
  }
  return out;
}

export async function predict(games: NormalGame[]): Promise<PickRow[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return games.flatMap(fallback);

  try {
    // Lightweight JSON-only call
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: key });
    const compact = games.map(g => ({
      league: g.league,
      home: g.homeTeam, away: g.awayTeam, time: g.kickoffISO,
      spread: g.markets?.spread, total: g.markets?.total,
      mlHome: g.markets?.ml?.home, mlAway: g.markets?.ml?.away,
    }));

    const sys = "You are a sports trading model. Return strict JSON only.";
    const user = `Given the games and market lines below, output an array named "picks" of objects with fields: league, homeTeam, awayTeam, kickoffISO, market (SPREAD|ML|TOTAL), pick (HOME|AWAY|OVER|UNDER), line (number if SPREAD/TOTAL), edgePct (0-30).
Games: ${JSON.stringify(compact)}`;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: sys}, { role: "user", content: user }],
      temperature: 0.2
    });

    const text = resp.output_text || '';
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.picks)) throw new Error('bad json');
    // minimal guardrails to our shape
    const cleaned: PickRow[] = parsed.picks.map((p:any) => ({
      league: p.league,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      kickoffISO: p.kickoffISO,
      market: p.market,
      pick: p.pick,
      line: typeof p.line === 'number' ? p.line : undefined,
      edgePct: typeof p.edgePct === 'number' ? p.edgePct : undefined,
    }));
    return cleaned;
  } catch {
    // Fallback if model fails
    return games.flatMap(fallback);
  }
}
