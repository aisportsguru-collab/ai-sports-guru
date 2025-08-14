import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type OddsMode = 'american' | 'decimal';

function toDecimal(american?: number | null): string {
  if (american === null || american === undefined || isNaN(Number(american))) return '–';
  const a = Number(american);
  const dec = a >= 100 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  return dec.toFixed(2);
}

function fmtOdds(v?: number | string | null, mode: OddsMode): string {
  if (v === null || v === undefined || v === '') return '–';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return mode === 'decimal' ? toDecimal(n) : (n > 0 ? `+${n}` : `${n}`);
}

function when(dt?: string | Date | null): string {
  if (!dt) return '–';
  try {
    const d = new Date(dt);
    const dtf = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    return dtf.format(d);
  } catch { return '–'; }
}

type Row = {
  label: 'ML' | 'Spread' | 'Total';
  left?: string;
  right?: string;
  lineNote?: string;
  pick?: string;
  conf?: number | string | null;
};

export type GameCardItem = {
  id: string;
  startTime?: string | Date;
  league?: string | null;
  away: string;
  home: string;
  rows: Row[];
  status?: string | null;
};

export type DisplayMode = 'compact' | 'detailed';

type Props = {
  item: GameCardItem;
  oddsMode?: OddsMode;
  displayMode?: DisplayMode;
  isFavorite?: boolean;
  isAlerted?: boolean;
  onToggleFavorite?: (teams: string[]) => void;
  onToggleAlert?: () => void;
  onShare?: () => void;
};

export default function GameCard({
  item,
  oddsMode = 'american',
  displayMode = 'detailed',
  isFavorite = false,
  isAlerted = false,
  onToggleFavorite,
  onToggleAlert,
  onShare,
}: Props) {
  const rows = displayMode === 'compact'
    ? item.rows.filter(r => r.label === 'ML')
    : item.rows;

  const isLive = !!item.status && /live|progress/i.test(item.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex:1 }}>
          <Text style={styles.match} numberOfLines={1}>{item.away} @ {item.home}</Text>
          {isLive ? (
            <View style={styles.live}><Text style={styles.liveText}>LIVE</Text></View>
          ) : (
            <Text style={styles.time}>{when(item.startTime)}</Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onShare} hitSlop={{ top:8,left:8,bottom:8,right:8 }}>
            <Text style={styles.icon} accessibilityLabel="Share">📤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggleAlert} hitSlop={{ top:8,left:8,bottom:8,right:8 }}>
            <Text style={styles.icon} accessibilityLabel="Toggle alert">{isAlerted ? '🔔' : '🔕'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onToggleFavorite?.([item.away, item.home])} hitSlop={{ top:8,left:8,bottom:8,right:8 }}>
            <Text style={[styles.icon, isFavorite && { color:'#ffe061' }]} accessibilityLabel="Toggle favorite">
              {isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {rows.map((r, idx) => (
        <View key={idx} style={styles.row}>
          <View style={{ width: 58 }}>
            <Text style={styles.rowLabel}>{r.label}</Text>
          </View>

          <View style={[styles.rowMid, r.label === 'Total' && { justifyContent: 'space-between' }]}>
            {r.label !== 'Total' ? (
              <>
                <Text style={styles.kv}>{r.left ?? '–'}</Text>
                <Text style={styles.kv}>{r.right ?? '–'}</Text>
              </>
            ) : (
              <Text style={styles.kv}>{r.lineNote ?? '–'}</Text>
            )}
          </View>

          <View style={styles.rowRight}>
            <View style={styles.pickPill}>
              <Text style={styles.pickText}>
                {r.pick ?? '—'}{r.conf !== undefined && r.conf !== null && r.conf !== '' ? ` • ${r.conf}%` : ''}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function buildRows(opts: {
  oddsMode: OddsMode;
  moneyline?: { away?: number | string | null; home?: number | string | null; pick?: 'AWAY'|'HOME'|string; conf?: number|string|null; };
  spread?: { number?: number | string | null; away?: number | string | null; home?: number | string | null; pick?: string|null; conf?: number|string|null; };
  total?: { number?: number | string | null; over?: number | string | null; under?: number | string | null; pick?: 'OVER'|'UNDER'|string|null; conf?: number|string|null; };
}): Row[] {
  const rows: Row[] = [];

  if (opts.moneyline) {
    rows.push({
      label: 'ML',
      left:  fmtOdds(opts.moneyline.away as any, opts.oddsMode),
      right: fmtOdds(opts.moneyline.home as any, opts.oddsMode),
      pick:  opts.moneyline.pick ?? undefined,
      conf:  opts.moneyline.conf ?? undefined
    });
  }

  if (opts.spread) {
    const n = (opts.spread.number ?? '–');
    rows.push({
      label: 'Spread',
      left:  typeof opts.spread.away  !== 'undefined' && opts.spread.away  !== null ? String(opts.spread.away)  : '–',
      right: typeof opts.spread.home  !== 'undefined' && opts.spread.home  !== null ? String(opts.spread.home)  : '–',
      pick:  opts.spread.pick ?? (typeof n === 'number' ? (n > 0 ? `AWAY +${n}` : `HOME ${n}`) : undefined),
      conf:  opts.spread.conf ?? undefined
    });
  }

  if (opts.total) {
    const n = opts.total.number ?? '–';
    rows.push({
      label: 'Total',
      lineNote: typeof n === 'number' ? `O/U ${n}` : `O/U ${n}`,
      pick:  opts.total.pick ?? undefined,
      conf:  opts.total.conf ?? undefined
    });
  }
  return rows;
}

const styles = StyleSheet.create({
  card: { backgroundColor:'#121212', borderColor:'#232323', borderWidth:1, borderRadius:16, padding:14, gap:10 },
  header: { flexDirection:'row', alignItems:'center', gap:12 },
  match: { color:'#fff', fontWeight:'900', flex:0, paddingRight:10 },
  time: { color:'#a8a8a8', marginTop:2 },
  live: { alignSelf:'flex-start', backgroundColor:'#e7083b', paddingHorizontal:8, paddingVertical:2, borderRadius:6, marginTop:2 },
  liveText: { color:'#fff', fontWeight:'900', fontSize:12 },
  actions: { flexDirection:'row', gap:10, marginLeft:'auto' },
  icon: { color:'#dcdcdc', fontSize:18 },

  row: { flexDirection:'row', alignItems:'center', backgroundColor:'#141414', borderRadius:12, padding:10, gap:10, borderColor:'#1f1f1f', borderWidth:1 },
  rowLabel: { color:'#ffd700', fontWeight:'900' },
  rowMid: { flex:1, flexDirection:'row', justifyContent:'space-evenly' },
  rowRight: { width: 140, alignItems:'flex-end' },

  kv: { color:'#dcdcdc' },
  pickPill: { paddingVertical:6, paddingHorizontal:10, backgroundColor:'#222207', borderColor:'#3a3a1a', borderWidth:1, borderRadius:999 },
  pickText: { color:'#ffe061', fontWeight:'900' },
});
