import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function Loader({ height=100 }:{height?:number}) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );
    loop.start(); return () => loop.stop();
  }, []);
  const translateX = x.interpolate({ inputRange:[0,1], outputRange:[-200, 200] });
  return (
    <View style={[styles.card, {height}]}>
      <Animated.View style={[styles.shimmer, { transform:[{translateX}] }]} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { overflow:'hidden', backgroundColor:'#121212', borderRadius:14, borderWidth:1, borderColor:'#1f1f1f' },
  shimmer: { width:120, height:'200%', backgroundColor:'#222', opacity:0.35, transform:[{rotate:'15deg'}] }
});
