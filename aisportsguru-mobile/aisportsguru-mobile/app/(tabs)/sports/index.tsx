import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const SPORTS = ['NFL','NBA','MLB','NHL','NCAAF','NCAAB','WNBA'];

export default function SportsIndex() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Choose a sport</Text>
      {SPORTS.map((s) => (
        <TouchableOpacity
          key={s}
          style={styles.card}
          onPress={() => router.push(`/(tabs)/sports/${s.toLowerCase()}`)}
        >
          <Text style={styles.cardText}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, backgroundColor:'#0a0a0a', flexGrow:1 },
  title: { color:'#fff', fontSize:18, fontWeight:'800', marginBottom:8 },
  card: { padding:16, backgroundColor:'#141414', borderRadius:14, borderColor:'#232323', borderWidth:1 },
  cardText: { color:'#fff', fontWeight:'700' }
});
