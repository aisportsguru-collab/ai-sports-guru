// /api/games
// Returns ALL upcoming games for the league within ?daysFrom (default 7),
// even if no odds exist yet. Each row includes has_odds.
// Optional: withOdds=1 to filter to only games that currently have odds.
type GameRow = {
  game_id: string
  sport: string
  start_time: string
  home_team?: string | null
  away_team?: string | null
}

const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function errJson(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`supabase ${res.status} ${txt}`)
  }
  return res.json()
}

function isoNow() { return new Date().toISOString() }
function isoPlusDays(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
function inList(ids: string[]) {
  const q = ids.map((v) => `"${v}"`).join(',')
  return `in.(${q})`
}

async function handle(req: Request) {
  if (!BASE || !SERVICE_KEY) return errJson(500, 'Server env not configured for Supabase')

  const url = new URL(req.url)
  const league = (url.searchParams.get('league') || '').toLowerCase().trim()
  const daysFrom = Math.max(1, Math.min(60, Number(url.searchParams.get('daysFrom') || '7')))
  const withOdds = url.searchParams.get('withOdds') === '1'
  if (!league) return errJson(400, 'Missing ?league')

  const from = isoNow()
  const to = isoPlusDays(daysFrom)

  const selCols = ['game_id','sport','start_time','home_team','away_team'].join(',')
  const gamesUrl =
    `${BASE}/rest/v1/games` +
    `?select=${encodeURIComponent(selCols)}` +
    `&sport=eq.${encodeURIComponent(league)}` +
    `&start_time=gte.${encodeURIComponent(from)}` +
    `&start_time=lte.${encodeURIComponent(to)}` +
    `&order=start_time.asc`

  let games: GameRow[] = []
  try { games = await fetchJson(gamesUrl) }
  catch (e: any) { return errJson(502, e?.message || 'Failed to fetch games') }

  if (!Array.isArray(games) || games.length === 0) {
    return new Response(JSON.stringify({ data: [], meta: { league, daysFrom, count: 0 } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }

  const ids = games.map((g) => g.game_id).filter(Boolean)
  let withOddsSet = new Set<string>()
  if (ids.length) {
    const oddsUrl =
      `${BASE}/rest/v1/odds_snapshots?select=game_id&game_id=${encodeURIComponent(inList(ids))}&limit=${ids.length}`
    try {
      const rows: { game_id: string }[] = await fetchJson(oddsUrl)
      withOddsSet = new Set(rows.map((r) => r.game_id))
    } catch { withOddsSet = new Set() }
  }

  let annotated = games.map((g) => ({ ...g, has_odds: withOddsSet.has(g.game_id) }))
  if (withOdds) annotated = annotated.filter((g) => g.has_odds)

  return new Response(
    JSON.stringify({ data: annotated, meta: { league, daysFrom, count: annotated.length, filteredWithOdds: withOdds } }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

// App Router export
export async function GET(req: Request) { return handle(req) }

// Pages Router fallback
export default async function handler(req: any, res: any) {
  if (req?.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' }); return
  }
  const r = await handle(new Request(req.url, { headers: req.headers }))
  res.status(r.status).setHeader('content-type', r.headers.get('content-type') || 'application/json')
  res.send(await r.text())
}
