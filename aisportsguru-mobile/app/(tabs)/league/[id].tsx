import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { LeagueGame } from '../../../src/data/games';
import { fetchLeagueGames } from '../../../src/data/games';
import type { Prediction } from '../../../src/data/predictions';
import { fetchPredictions } from '../../../src/data/predictions';

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const league = String(id || '');
  const [games, setGames] = useState<LeagueGame[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const when = new Date().toISOString().slice(0,10);
        const [g, p] = await Promise.all([
          fetchLeagueGames(league, when).catch(() => []),
          fetchPredictions(league, when).catch(() => []),
        ]);
        if (!alive) return;
        setGames(Array.isArray(g) ? g : []);
        setPreds(Array.isArray(p) ? p : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [league]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return games;
    return games.filter(g =>
      (g.homeTeam || '').toLowerCase().includes(t) ||
      (g.awayTeam || '').toLowerCase().includes(t)
    );
  }, [q, games]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#93f7bd" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{league.toUpperCase().replace(/_/g,' ')}</Text>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search teams…"
          placeholderTextColor="#8ba0b2"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* List */}
      <View style={{ gap: 10 }}>
        {filtered.map(g => {
          const m = g.markets ?? {};
          const byMarket = {
            SPREAD: preds.find(p => sameGame(p, g) && p.market === 'SPREAD'),
            ML:     preds.find(p => sameGame(p, g) && p.market === 'ML'),
            TOTAL:  preds.find(p => sameGame(p, g) && p.market === 'TOTAL'),
          };

          return (
            <View key={g.id || `${g.homeTeam}-${g.awayTeam}-${g.kickoffISO}`} style={styles.game}>
              <Text style={styles.leagueRow}>{g.awayTeam} @ {g.homeTeam}</Text>
              <Text style={styles.subtle}>
                {formatLocal(g.kickoffISO)} • Spread {fmtNum(m?.spread)} • Total {fmtNum(m?.total)}
              </Text>

              {/* Odds row */}
              <View style={styles.row}>
                {m?.ml?.home != null && <Chip label={`ML HOME ${fmtOdd(m.ml.home)}`} />}
                {m?.ml?.away != null && <Chip label={`ML AWAY ${fmtOdd(m.ml.away)}`} />}
                {m?.ml?.home == null && m?.ml?.away == null && m?.spread == null && m?.total == null && (
                  <Chip label="Lines pending" />
                )}
              </View>

              {/* Predictions row */}
              <View style={styles.row}>
                {byMarket.SPREAD && <Chip label={`SPREAD: ${byMarket.SPREAD.pick} ${fmtNum(byMarket.SPREAD.line)}`} accent />}
                {byMarket.ML &&     <Chip label={`ML: ${byMarket.ML.pick}${edge(byMarket.ML)}`} accent />}
                {byMarket.TOTAL &&  <Chip label={`TOTAL: ${byMarket.TOTAL.pick} ${fmtNum(byMarket.TOTAL.line)}`} accent />}
                {!byMarket.SPREAD && !byMarket.ML && !byMarket.TOTAL && (
                  <Chip label="No predictions yet" />
                )}
              </View>
            </View>
          );
        })}

        {(!loading && filtered.length === 0) && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matching teams</Text>
            <Text style={styles.emptySubtitle}>Try a different name or clear the search.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* helpers */
function sameGame(p: Prediction, g: LeagueGame) {
  const a = (p.kickoffISO || '').slice(0,16);
  const b = (g.kickoffISO || '').slice(0,16);
  return p.homeTeam === g.homeTeam && p.awayTeam === g.awayTeam && a === b;
}
function fmtNum(n?: number) { return (typeof n === 'number') ? String(n) : '—'; }
function fmtOdd(n?: number) {
  if (typeof n !== 'number') return '—';
  return n > 0 ? `+${n}` : `${n}`;
}
function formatLocal(iso?: string) {
  try {
    const d = iso ? new Date(iso) : null;
    return d ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBD';
  } catch { return 'TBD'; }
}
function edge(p?: Prediction) {
  const e = p?.edgePct ?? 0;
  return e ? ` · +${e}%` : '';
}

/* tiny chip */
function Chip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View style={[styles.chip, accent && styles.chipAccent]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0b0f2a', alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f1430',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1b2450',
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  game: {
    backgroundColor: '#0b1130',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1b2450',
    padding: 14,
    gap: 8,
  },
  leagueRow: { color: '#fff', fontWeight: '700' },
  subtle: { color: '#8fb0ff', fontSize: 12 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#263259',
    backgroundColor: 'rgba(63,192,96,0.12)',
    paddingHorizontal: 10,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAccent: { backgroundColor: 'rgba(147,247,189,0.15)', borderColor: '#3fc060' },
  chipText: { color: '#a8b8ff', fontSize: 12, fontWeight: '700' },

  empty: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#0f1430',
    borderWidth: 1,
    borderColor: '#263259',
  },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: '#8fb0ff', fontSize: 12 },
});
