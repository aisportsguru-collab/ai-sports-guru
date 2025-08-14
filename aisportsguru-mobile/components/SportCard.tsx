import React from 'react';
import { View, Text, Pressable, Share } from 'react-native';

export default function SportCard({ item, compact=false, isFav=false, onFavorite }: any) {
  const pct = Math.round((item?.confidence || 0) * 100);
  const shareIt = () => {
    const t = `AI Sports Guru pick\n${item.away} at ${item.home}\nPick: ${item.pick}\nConfidence: ${pct}%`;
    Share.share({ message: t });
  };
  return (
    <View style={{ padding:12, marginBottom:12, borderWidth:1, borderRadius:12 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
        <Text style={{ fontWeight:'700' }}>{item.away} at {item.home}</Text>
        <Pressable onPress={onFavorite}><Text>{isFav ? '★' : '☆'}</Text></Pressable>
      </View>
      <Text>Pick: {item.pick}</Text>
      {!compact && (
        <>
          <Text>Moneyline: {item.moneylineAway} , {item.moneylineHome}</Text>
          <Text>Spread: {item.spread}</Text>
          <Text>Total: {item.total}</Text>
        </>
      )}
      <View style={{ height:8 }} />
      <View style={{ height:8, backgroundColor:'#e5e7eb', borderRadius:8 }}>
        <View style={{ height:8, width:`${pct}%`, backgroundColor:'#22c55e', borderRadius:8 }} />
      </View>
      <View style={{ height:8 }} />
      <Pressable onPress={shareIt}><Text>Share</Text></Pressable>
    </View>
  );
}
