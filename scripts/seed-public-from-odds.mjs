import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE env (URL or SERVICE_ROLE_KEY)')
}
const sb = createClient(url, serviceKey)

/** Convert American ML -> implied probability */
function mlToProb(ml) {
  if (ml == null) return null
  if (ml > 0) return 100 / (ml + 100)
  return Math.abs(ml) / (Math.abs(ml) + 100)
}

/** Remove vig: scale so away+home = 1 when both present */
function deVig(pA, pH) {
  const a = pA ?? 0
  const h = pH ?? 0
  const s = a + h
  if (s > 0) return [a / s, h / s]
  return [null, null]
}

async function main() {
  const { data: rows, error } = await sb.rpc('get_latest_odds_with_games', {}) // optional if you already have a view
  if (error || !rows) {
    // Fallback: manual join for upcoming games in the next 21 days, prefer latest odds per game_id
    const { data: games, error: gErr } = await sb
      .from('games')
      .select('game_id, league, game_time, away_team, home_team')
      .gte('game_time', new Date(Date.now() - 6 * 3600_000).toISOString())   // last 6h .. future
      .lte('game_time', new Date(Date.now() + 21 * 24 * 3600_000).toISOString())
    if (gErr) throw gErr

    // get any odds rows we have for those games (pick “best” or latest per book; here we just pick one row per game)
    const ids = games.map(g => g.game_id)
    const { data: odds, error: oErr } = await sb
      .from('odds')
      .select('game_id, sportsbook, moneyline_away, moneyline_home, updated_at')
      .in('game_id', ids)
      .order('updated_at', { ascending: false })
    if (oErr) throw oErr

    const byGame = new Map()
    for (const o of odds) {
      if (!byGame.has(o.game_id)) byGame.set(o.game_id, o) // keep the most recent per game
    }

    let upserts = []
    for (const g of games) {
      const o = byGame.get(g.game_id)
      if (!o) continue
      const pAway = mlToProb(o.moneyline_away)
      const pHome = mlToProb(o.moneyline_home)
      let [awayPct, homePct] = deVig(pAway, pHome)
      if (awayPct == null || homePct == null) continue

      upserts.push({ game_id: g.game_id, side: 'away', percent: awayPct, source: 'implied', updated_at: new Date().toISOString() })
      upserts.push({ game_id: g.game_id, side: 'home', percent: homePct, source: 'implied', updated_at: new Date().toISOString() })
    }

    if (upserts.length === 0) {
      console.log('No odds available to synthesize public %')
      return
    }
    const { error: upErr } = await sb
      .from('public_bets')
      .upsert(upserts, { onConflict: 'game_id,side' })
    if (upErr) throw upErr

    console.log(`Seeded public_bets from implied odds for ${upserts.length/2} games.`)
  } else {
    // If you create an RPC/view, you could handle it here. (Not required now.)
    console.log('Custom RPC path not used in this fallback script.')
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
