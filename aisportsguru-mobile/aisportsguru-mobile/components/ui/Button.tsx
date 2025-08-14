import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'ghost';
};
export default function Button({ title, onPress, disabled, style, variant='primary' }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        disabled && { opacity: 0.6 },
        style
      ]}
    >
      <Text style={[styles.text, variant === 'ghost' && { color: '#fff' }]}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  primary: { backgroundColor: '#ffd700', borderColor: '#e7c600' },
  ghost: { backgroundColor: '#141414', borderColor: '#262626' },
  text: { color: '#0a0a0a', fontWeight: '900' }
});
