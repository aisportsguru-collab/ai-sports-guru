import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

export default function Skeleton({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          borderRadius: 12,
          overflow: 'hidden',
          opacity,
        },
        style,
      ]}
    />
  );
}
