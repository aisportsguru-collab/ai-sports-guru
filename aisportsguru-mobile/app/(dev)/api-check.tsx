import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || '';

export default function ApiCheck() {
  const [out, setOut] = useState<string>('Loading…');

  useEffect(() => {
    (async () => {
      try {
        const h = await fetch(`${API_BASE}/health`).then(r => r.json());
        const p = await fetch(`${API_BASE}/predictions/nba?daysFrom=0`).then(r => r.json());
        setOut(JSON.stringify({ API_BASE, health: h, predictions_sample: p }, null, 2));
      } catch (e: any) {
        setOut(`Error: ${String(e?.message || e)}`);
      }
    })();
  }, []);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
        API Check (uses EXPO_PUBLIC_API_BASE)
      </Text>
      <Text selectable style={{ fontFamily: 'Courier', fontSize: 12 }}>
        {out}
      </Text>
    </ScrollView>
  );
}
