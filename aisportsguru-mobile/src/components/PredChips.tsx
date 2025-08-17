import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LeagueMarketPrediction } from '../data/leaguePredictions';

/** Simple inline chips showing SPREAD / ML / TOTAL picks for a game. */
export default function PredChips({ preds }: { preds: LeagueMarketPrediction[] }) {
  if (!preds?.length) return null;
  return (
    <View style={styles.row}>
      {preds.map((p, i) => (
        <View key={i} style={[styles.chip, chipColor(p.market)]}>
          <Text style={styles.chipText}>
            {labelFor(p)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function labelFor(p: LeagueMarketPrediction) {
  if (p.market === 'SPREAD') {
    const side = p.pick === 'HOME' ? 'HOME' : 'AWAY';
    const ln = p.line != null ? ` ${p.line > 0 ? '+' : ''}${p.line}` : '';
    return `SPREAD: ${side}${ln}`;
  }
  if (p.market === 'ML') {
    const side = p.pick === 'HOME' ? 'HOME' : 'AWAY';
    return `ML: ${side}`;
  }
  if (p.market === 'TOTAL') {
    const side = p.pick;
    const ln = p.line != null ? ` ${p.line}` : '';
    return `TOTAL: ${side}${ln}`;
  }
  return `${p.market}`;
}

function chipColor(market: 'ML'|'SPREAD'|'TOTAL') {
  switch (market) {
    case 'SPREAD': return { backgroundColor: 'rgba(147,247,189,0.12)', borderColor: '#2a6f59' };
    case 'ML':     return { backgroundColor: 'rgba(168,184,255,0.12)', borderColor: '#263259' };
    case 'TOTAL':  return { backgroundColor: 'rgba(255,196,77,0.12)',  borderColor: '#6a5a2a' };
    default:       return { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#253055' };
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: '#e6eeff', fontSize: 12, fontWeight: '700' },
});
