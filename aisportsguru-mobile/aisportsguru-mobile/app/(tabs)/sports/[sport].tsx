import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, SafeAreaView, TextInput, Share, Platform, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import GameCard, { GameCardItem, buildRows, DisplayMode } from '../../../components/GameCard';
import { loadFavorites, toggleFavorite } from '../../../lib/favorites';
import { requestNotificationPermission, scheduleGameStartNotification, cancelScheduledNotification } from '../../../lib/notifications';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://www.aisportsguru.com/api';
type OddsMode = 'american' | 'decimal';
const DAY_RANGE = [-2, -1, 0, 1, 2, 3, 4, 5];

const keyPrefMode = 'sp:prefs:oddsMode';
const keyPrefDay = (s: string) => `sp:prefs:day:${s}`;
const keyCache  = (s: string, d: number) => `sp:cache:${s}:${d}`;
const keyFavs   = (s: string) => `fav:${s}`;
const keyDisp   = (s: string) => `sp:prefs:display:${s}`;
const keyAlerts = (s: string) => `alerts:${s}`; // map gameId -> notificationId

export default function SportScreen() {
  const { sport } = useLocalSearchParams<{ sport: string }>();
  const sKey = String(sport || '').toLowerCase();
  const navigation = useNavigation();

  const [day, setDay] = useState<number>(0);
  const [mode, setMode] = useState<OddsMode>('american');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('detailed');
  const [q, setQ] = useState('');
  const [showFavsOnly, setShowFavsOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<GameCardItem[]>([]);

  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [alertsMap, setAlertsMap] = useState<Record<string, string>>({}); // gameId -> notificationId

  const shotRefs = useRef<Record<string, ViewShot | null>>({});

  useEffect(() => {
    navigation.setOptions?.({ title: String(sport || '').toUpperCase() });
  }, [navigation, sport]);

  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(keyPrefMode);
        if (savedMode === 'american' || savedMode === 'decimal') setMode(savedMode as OddsMode);
        const savedDay = await AsyncStorage.getItem(keyPrefDay(sKey));
        if (savedDay !== null && !Number.isNaN(Number(savedDay))) setDay(Number(savedDay));
        const savedDisp = await AsyncStorage.getItem(keyDisp(sKey));
        if (savedDisp === 'compact' || savedDisp === 'detailed') setDisplayMode(savedDisp as DisplayMode);
        setFavs(await loadFavorites(sKey));
        const rawAlerts = await AsyncStorage.getItem(keyAlerts(sKey));
        setAlertsMap(rawAlerts ? JSON.parse(rawAlerts) : {});
      } catch {}
    })();
  }, [sKey]);

  useEffect(() => { AsyncStorage.setItem(keyPrefMode, mode).catch(() => {}); }, [mode]);
  useEffect(() => { AsyncStorage.setItem(keyPrefDay(sKey), String(day)).catch(() => {}); }, [day, sKey]);
  useEffect(() => { AsyncStorage.setItem(keyDisp(sKey), displayMode).catch(() => {}); }, [displayMode, sKey]);

  const url = useMemo(() => `${API_BASE}/predictions/${sKey}?daysFrom=${day}`, [sKey, day]);

  const fetchIt = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      let json: any = [];
      try { json = await res.json(); } catch { json = []; }
      const list = Array.isArray(json) ? json : (json?.data ?? []);
      const items: GameCardItem[] = (list || []).map(adaptRecord(mode));
      setData(items);
      await AsyncStorage.setItem(keyCache(sKey, day), JSON.stringify(items));
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to fetch games.');
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [url, mode, sKey, day]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(keyCache(sKey, day));
        if (cached && !cancelled) {
          try { setData(JSON.parse(cached)); setLoading(false); } catch {}
        }
      } catch {}
      if (!cancelled) fetchIt();
    })();
    return () => { cancelled = true; };
  }, [fetchIt, sKey, day]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchIt(); }, [fetchIt]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = data;
    if (needle) {
      list = list.filter(it =>
        it.away.toLowerCase().includes(needle) ||
        it.home.toLowerCase().includes(needle)
      );
    }
    if (showFavsOnly) {
      list = list.filter(it =>
        favs.has(it.away.toLowerCase()) || favs.has(it.home.toLowerCase())
      );
    }
    // if showing favorites, pin them on top
    if (!needle && favs.size > 0) {
      list = [...list].sort((a, b) => {
        const af = favs.has(a.away.toLowerCase()) || favs.has(a.home.toLowerCase());
        const bf = favs.has(b.away.toLowerCase()) || favs.has(b.home.toLowerCase());
        return Number(bf) - Number(af);
      });
    }
    return list;
  }, [q, data, favs, showFavsOnly]);

  const toggleFavFor = useCallback(async (teams: string[]) => {
    try {
      const next = await toggleFavorite(sKey, favs, teams);
      setFavs(next);
    } catch {}
  }, [sKey, favs]);

  const onToggleAlert = useCallback(async (game: GameCardItem) => {
    const gameId = game.id;
    // cancel existing
    if (alertsMap[gameId]) {
      await cancelScheduledNotification(alertsMap[gameId]);
      const copy = { ...alertsMap };
      delete copy[gameId];
      setAlertsMap(copy);
      await AsyncStorage.setItem(keyAlerts(sKey), JSON.stringify(copy));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      return;
    }
    // schedule new (10 minutes before start if available)
    const start = game.startTime ? new Date(game.startTime as any) : null;
    const fire = start ? new Date(start.getTime() - 10 * 60 * 1000) : null;
    if (!fire || fire.getTime() <= Date.now()) {
      Alert.alert('No start time', 'Cannot schedule alert without a future start time.');
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) { Alert.alert('Permission required', 'Enable notifications to get alerts.'); return; }
    const title = `${game.away} @ ${game.home}`;
    const identifier = await scheduleGameStartNotification({
      id: gameId,
      title,
      body: 'Game starting soon',
      fireDate: fire
    });
    if (identifier) {
      const copy = { ...alertsMap, [gameId]: identifier };
      setAlertsMap(copy);
      await AsyncStorage.setItem(keyAlerts(sKey), JSON.stringify(copy));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }
  }, [alertsMap, sKey]);

  const shareCard = useCallback(async (gameId: string, text: string) => {
    const ref = shotRefs.current[gameId];
    if (!ref) return;
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      // Prefer expo-sharing if available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share pick' });
      } else {
        if (Platform.OS === 'ios') {
          await Share.share({ url: uri });
        } else {
          await Share.share({ message: text });
        }
      }
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Could not share card.');
    }
  }, []);

  const Header = (
    <View style={styles.toolbar}>
      <View>
        <View style={styles.rowWrap}>
          <View style={styles.chips}>
            {DAY_RANGE.map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => { setDay(d); try { Haptics.selectionAsync(); } catch {} }}
                style={[styles.chip, day === d && styles.chipActive]}
              >
                <Text style={[styles.chipText, day === d && styles.chipTextActive]}>
                  {d === 0 ? 'Today' : d > 0 ? `+${d}d` : `${d}d`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity
              onPress={() => { setMode('american'); try { Haptics.selectionAsync(); } catch {} }}
              style={[styles.modeBtn, mode === 'american' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'american' && styles.modeTextActive]}>American</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMode('decimal'); try { Haptics.selectionAsync(); } catch {} }}
              style={[styles.modeBtn, mode === 'decimal' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'decimal' && styles.modeTextActive]}>Decimal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rowWrap}>

          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity
              onPress={() => { setDisplayMode('compact'); try { Haptics.selectionAsync(); } catch {} }}
              style={[styles.modeBtn, displayMode === 'compact' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, displayMode === 'compact' && styles.modeTextActive]}>Compact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setDisplayMode('detailed'); try { Haptics.selectionAsync(); } catch {} }}
              style={[styles.modeBtn, displayMode === 'detailed' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, displayMode === 'detailed' && styles.modeTextActive]}>Detailed</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => { setShowFavsOnly(v => !v); try { Haptics.selectionAsync(); } catch {} }}
            style={[styles.modeBtn, showFavsOnly && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, showFavsOnly && styles.modeTextActive]}>
              {showFavsOnly ? '★ Favorites' : '☆ Favorites'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop:10 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search team…"
            placeholderTextColor="#7a7a7a"
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.wrap}>
      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ color:'#aaa', marginTop:10 }}>Loading games…</Text>
        </View>
      ) : err && data.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color:'#ff6b6b' }}>{err}</Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={Header}
          contentContainerStyle={{ padding:16, gap:12 }}
          data={filtered}
          keyExtractor={(it) => it.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <ViewShot
              ref={(r) => { shotRefs.current[item.id] = r }}
              style={{ borderRadius:16, overflow:'hidden' }}
            >
              <GameCard
                item={item}
                displayMode={displayMode}
                isFavorite={favs.has(item.away.toLowerCase()) || favs.has(item.home.toLowerCase())}
                isAlerted={!!alertsMap[item.id]}
                onToggleFavorite={(teams) => toggleFavFor(teams)}
                onToggleAlert={() => onToggleAlert(item)}
                onShare={() => shareCard(item.id, `${item.away} @ ${item.home}`)}
              />
            </ViewShot>
          )}
          ListEmptyComponent={
            <View style={{ alignItems:'center', paddingTop:40 }}>
              <Text style={{ color:'#bdbdbd' }}>
                {q ? 'No games match your search.' : 'No games found for this day.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function adaptRecord(oddsMode: OddsMode) {
  return (r: any, idx: number): GameCardItem => {
    const away = r.away_team ?? r.away ?? r.team_away ?? r.awayTeam ?? 'Away';
    const home = r.home_team ?? r.home ?? r.team_home ?? r.homeTeam ?? 'Home';
    const id   = r.id ?? r.game_id ?? r.match_id ?? `${away}@${home}-${r.game_time ?? r.start_time ?? idx}`;
    const start = r.game_time ?? r.commence_time ?? r.start_time ?? r.date ?? null;

    const mlAway = r.away_ml ?? r.moneyline_away ?? r.awayMoneyline ?? r.ml_away ?? null;
    const mlHome = r.home_ml ?? r.moneyline_home ?? r.homeMoneyline ?? r.ml_home ?? null;

    const spreadNum  = r.spread ?? r.point_spread ?? r.line ?? r.handicap ?? null;
    const spreadAway = r.spread_away ?? r.away_spread ?? null;
    const spreadHome = r.spread_home ?? r.home_spread ?? null;

    const totalNum   = r.total ?? r.total_points ?? r.over_under ?? r.totals ?? null;
    const totalOver  = r.over_odds ?? r.odds_over ?? r.total_over ?? null;
    const totalUnder = r.under_odds ?? r.odds_under ?? r.total_under ?? null;

    const pickML     = r.pick_ml ?? r.model_pick_ml ?? r.ml_pick ?? (r.model_pick && (String(r.model_pick).toUpperCase().includes('HOME') ? 'HOME' : String(r.model_pick).toUpperCase().includes('AWAY') ? 'AWAY' : r.model_pick));
    const confML     = r.confidence_ml ?? r.ml_confidence ?? r.confidence ?? null;
    const pickSpread = r.pick_spread ?? r.model_pick_spread ?? r.spread_pick ?? null;
    const confSpread = r.confidence_spread ?? r.spread_confidence ?? r.confidence ?? null;
    const pickTotal  = r.pick_total ?? r.model_pick_total ?? r.total_pick ?? null;
    const confTotal  = r.confidence_total ?? r.total_confidence ?? r.confidence ?? null;

    const rows = buildRows({
      oddsMode,
      moneyline: { away: mlAway, home: mlHome, pick: pickML, conf: confML },
      spread:    { number: spreadNum, away: spreadAway, home: spreadHome, pick: pickSpread, conf: confSpread },
      total:     { number: totalNum, over: totalOver, under: totalUnder, pick: pickTotal, conf: confTotal }
    });

    return { id, startTime: start, league: r.league ?? r.sport_key ?? null, away, home, rows, status: r.status ?? r.game_status ?? null };
  };
}

const styles = StyleSheet.create({
  wrap: { flex:1, backgroundColor:'#0a0a0a' },
  center: { flex:1, alignItems:'center', justifyContent:'center' },

  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomColor:'#171717',
    borderBottomWidth: 1,
    backgroundColor:'#0a0a0a',
  },
  rowWrap: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:6 },
  chips: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip: { borderColor:'#2a2a2a', borderWidth:1, paddingVertical:6, paddingHorizontal:10, borderRadius:999 },
  chipActive: { backgroundColor:'#ffd700', borderColor:'#ffd700' },
  chipText: { color:'#bdbdbd', fontWeight:'700' },
  chipTextActive: { color:'#0a0a0a' },

  modeBtn: { borderColor:'#2a2a2a', borderWidth:1, borderRadius:999, paddingVertical:6, paddingHorizontal:10 },
  modeBtnActive: { backgroundColor:'#1d1d1d', borderColor:'#3a3a3a' },
  modeText: { color:'#bdbdbd', fontWeight:'800' },
  modeTextActive: { color:'#fff' },

  search: {
    backgroundColor:'#131313',
    borderColor:'#232323',
    borderWidth:1,
    color:'#fff',
    borderRadius:12,
    paddingVertical:10,
    paddingHorizontal:12
  },
});
