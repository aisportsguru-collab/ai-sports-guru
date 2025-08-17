import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../ui/theme';

export default function GradientButton({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={style}>
      <LinearGradient
        colors={['#FFD54A', '#FACC15']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '700', color: '#111827' },
});
