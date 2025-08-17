import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radius, spacing } from '../ui/theme';

export default function Card({
  style,
  ...rest
}: ViewProps & { children: React.ReactNode }) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});
